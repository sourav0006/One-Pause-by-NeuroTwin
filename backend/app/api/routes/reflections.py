import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.ai.base import (
    AIProviderConfigError,
    AIProviderException,
    AIProviderUnavailableError,
    AIProviderValidationError,
    BaseAIProvider,
)
from app.ai.deps import get_ai_provider
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.session import ReflectionSession
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.reflection import (
    AnalyzeRequest,
    ClarifyRequest,
    CompleteRequest,
    HypothesisUpdateRequest,
    QuestionsRequest,
    QuestionsResponse,
    ReflectionResponse,
    ReportedFact,
    SaveSessionRequest,
    SessionSummaryResponse,
    StructuredReflectionState,
)

router = APIRouter(prefix="/reflections", tags=["Reflections"])


def _handle_ai_exception(e: AIProviderException):
    """Map AI provider domain exceptions to structured HTTP responses."""
    if isinstance(e, (AIProviderConfigError, AIProviderUnavailableError)):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": e.code, "message": e.message},
        )
    elif isinstance(e, AIProviderValidationError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": e.code, "message": e.message},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "AI_ERROR", "message": "An AI error occurred."},
        )


async def _get_user_session(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> ReflectionSession:
    """Retrieve reflection session enforcing authenticated user ownership."""
    stmt = select(ReflectionSession).where(
        ReflectionSession.id == session_id,
        ReflectionSession.user_id == user_id,
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reflection session not found or access denied",
        )
    return session


@router.post("/questions", response_model=QuestionsResponse)
async def generate_behavioural_questions(
    req: QuestionsRequest,
    current_user: User = Depends(get_current_user),
    ai_provider: BaseAIProvider = Depends(get_ai_provider),
):
    """Generate three tailored behavioural questions for a situation before map generation."""
    try:
        questions = await ai_provider.generate_behavioural_questions(
            situation=req.situation,
            context=req.context,
        )
        return QuestionsResponse(questions=questions)
    except AIProviderException as e:
        _handle_ai_exception(e)


@router.post("/analyze", response_model=ReflectionResponse, status_code=status.HTTP_201_CREATED)
async def analyze_situation(
    req: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
    ai_provider: BaseAIProvider = Depends(get_ai_provider),
    db: AsyncSession = Depends(get_db),
):
    """Analyze a situation using Gemini, store structured state, and return initial map."""
    try:
        structured_state = await ai_provider.analyze_situation(
            situation=req.situation,
            context=req.context,
            behavioural_answers=req.behavioural_answers,
        )
    except AIProviderException as e:
        _handle_ai_exception(e)

    if len(structured_state.possible_responses) != 3:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "AI_VALIDATION_ERROR",
                "message": f"Initial reflection requires exactly 3 response options, got {len(structured_state.possible_responses)}.",
            },
        )

    # Derive short title from encounter description
    title = structured_state.encounter.description[:80] if structured_state.encounter else None

    # Persist session in PostgreSQL (unsaved by default until explicit save)
    session = ReflectionSession(
        user_id=current_user.id,
        title=title,
        status="in_progress",
        is_saved=False,
        selected_response_id=None,
        initial_situation=req.situation.strip(),
        current_state=structured_state.model_dump(),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    return ReflectionResponse(
        id=session.id,
        initial_situation=session.initial_situation,
        status=session.status,
        is_saved=session.is_saved,
        selected_response_id=session.selected_response_id,
        title=session.title,
        state=structured_state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


@router.post("/{session_id}/clarify", response_model=ReflectionResponse)
async def clarify_reflection(
    session_id: uuid.UUID,
    req: ClarifyRequest,
    current_user: User = Depends(get_current_user),
    ai_provider: BaseAIProvider = Depends(get_ai_provider),
    db: AsyncSession = Depends(get_db),
):
    """Incorporate clarification answer into reflection state and update map."""
    session = await _get_user_session(session_id, current_user.id, db)
    if session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot clarify a completed reflection session",
        )

    current_state = StructuredReflectionState.model_validate(session.current_state)

    try:
        updated_state = await ai_provider.clarify_reflection(
            current_state=current_state,
            user_answer=req.answer,
        )
    except AIProviderException as e:
        _handle_ai_exception(e)

    # Invariant: Never discard user's previous hypothesis corrections, notes, or dismissals
    prev_hypotheses = {h.id: h for h in current_state.hypotheses}
    merged_hypotheses = []
    seen_ids = set()

    for h in updated_state.hypotheses:
        prev = prev_hypotheses.get(h.id)
        if prev:
            # Enforce retention of user manual status & notes
            if prev.status in ("dismissed", "corrected"):
                h.status = prev.status
            if prev.user_note:
                h.user_note = prev.user_note
        merged_hypotheses.append(h)
        seen_ids.add(h.id)

    # Re-attach any previous hypothesis that had a user note or dismissed status if AI omitted it
    for prev_id, prev_h in prev_hypotheses.items():
        if prev_id not in seen_ids and (prev_h.status in ("dismissed", "corrected") or prev_h.user_note):
            merged_hypotheses.append(prev_h)

    updated_state.hypotheses = merged_hypotheses

    # Invariant: Preserve all previous reported facts and record user's clarification answer
    existing_fact_texts = {f.text.strip().lower() for f in updated_state.reported_facts}
    for old_fact in current_state.reported_facts:
        if old_fact.text.strip().lower() not in existing_fact_texts:
            updated_state.reported_facts.insert(0, old_fact)
            existing_fact_texts.add(old_fact.text.strip().lower())

    clarify_lower = req.answer.strip().lower()
    if not any(clarify_lower in f.text.lower() for f in updated_state.reported_facts):
        new_fid = f"fact_{len(updated_state.reported_facts) + 1}"
        updated_state.reported_facts.append(
            ReportedFact(
                id=new_fid,
                text=f"Clarification: {req.answer.strip()}",
                source="user",
            )
        )

    # Invariant: Preserve behavioural answers
    if current_state.behavioural_answers and not updated_state.behavioural_answers:
        updated_state.behavioural_answers = current_state.behavioural_answers

    # Invariant: Guarantee exactly 3 distinct possible responses are maintained
    if len(updated_state.possible_responses) != 3:
        if len(updated_state.possible_responses) < 3 and current_state.possible_responses:
            existing_actions = {opt.action.strip().lower() for opt in updated_state.possible_responses}
            for prior_opt in current_state.possible_responses:
                if prior_opt.action.strip().lower() not in existing_actions:
                    updated_state.possible_responses.append(prior_opt)
                    existing_actions.add(prior_opt.action.strip().lower())
                    if len(updated_state.possible_responses) == 3:
                        break

        if len(updated_state.possible_responses) != 3:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "code": "AI_VALIDATION_ERROR",
                    "message": f"Reflection clarification requires exactly 3 response options, got {len(updated_state.possible_responses)}.",
                },
            )

    session.current_state = updated_state.model_dump()
    flag_modified(session, "current_state")
    session.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(session)

    return ReflectionResponse(
        id=session.id,
        initial_situation=session.initial_situation,
        status=session.status,
        is_saved=session.is_saved,
        selected_response_id=session.selected_response_id,
        title=session.title,
        state=updated_state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


@router.patch("/{session_id}/hypotheses/{hypothesis_id}", response_model=ReflectionResponse)
async def update_hypothesis(
    session_id: uuid.UUID,
    hypothesis_id: str,
    req: HypothesisUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a hypothesis as active, corrected, or dismissed."""
    session = await _get_user_session(session_id, current_user.id, db)
    if session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify hypotheses on a completed reflection session",
        )

    state = StructuredReflectionState.model_validate(session.current_state)
    found = False

    for hyp in state.hypotheses:
        if hyp.id == hypothesis_id:
            hyp.status = req.status
            if req.corrected_text:
                hyp.user_note = req.corrected_text
            found = True
            break

    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hypothesis '{hypothesis_id}' not found in this reflection",
        )

    session.current_state = state.model_dump()
    flag_modified(session, "current_state")
    session.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(session)

    return ReflectionResponse(
        id=session.id,
        initial_situation=session.initial_situation,
        status=session.status,
        is_saved=session.is_saved,
        selected_response_id=session.selected_response_id,
        title=session.title,
        state=state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


@router.post("/{session_id}/options", response_model=ReflectionResponse)
async def refresh_options(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    ai_provider: BaseAIProvider = Depends(get_ai_provider),
    db: AsyncSession = Depends(get_db),
):
    """Generate or refresh balanced response options for this reflection."""
    session = await _get_user_session(session_id, current_user.id, db)
    if session.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot refresh options for a completed reflection session",
        )
    state = StructuredReflectionState.model_validate(session.current_state)

    try:
        new_options = await ai_provider.generate_options(state)
    except AIProviderException as e:
        _handle_ai_exception(e)

    # Invariant: Ensure regenerated options contain exactly 3 choices
    if not new_options or len(new_options) != 3:
        if new_options and len(new_options) < 3 and state.possible_responses:
            existing_actions = {opt.action.strip().lower() for opt in new_options}
            for prior_opt in state.possible_responses:
                if prior_opt.action.strip().lower() not in existing_actions:
                    new_options.append(prior_opt)
                    existing_actions.add(prior_opt.action.strip().lower())
                    if len(new_options) == 3:
                        break

        if not new_options or len(new_options) != 3:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "code": "AI_VALIDATION_ERROR",
                    "message": f"Option regeneration requires exactly 3 response options, got {len(new_options) if new_options else 0}.",
                },
            )

    state.possible_responses = new_options
    session.current_state = state.model_dump()
    flag_modified(session, "current_state")
    session.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(session)

    return ReflectionResponse(
        id=session.id,
        initial_situation=session.initial_situation,
        status=session.status,
        is_saved=session.is_saved,
        selected_response_id=session.selected_response_id,
        title=session.title,
        state=state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


@router.post("/{session_id}/complete", response_model=ReflectionResponse)
async def complete_reflection(
    session_id: uuid.UUID,
    req: CompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a reflection as completed without forcing permanent persistence."""
    session = await _get_user_session(session_id, current_user.id, db)
    state = StructuredReflectionState.model_validate(session.current_state)

    if req.selected_option_id:
        valid_ids = {opt.id for opt in state.possible_responses}
        if req.selected_option_id not in valid_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Selected option ID '{req.selected_option_id}' does not exist in this reflection.",
            )
        session.selected_response_id = req.selected_option_id

    session.status = "completed"
    session.completed_at = datetime.now(UTC)
    session.updated_at = datetime.now(UTC)
    await db.flush()
    await db.refresh(session)

    return ReflectionResponse(
        id=session.id,
        initial_situation=session.initial_situation,
        status=session.status,
        is_saved=session.is_saved,
        selected_response_id=session.selected_response_id,
        title=session.title,
        state=state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


@router.post("/{session_id}/save", response_model=ReflectionResponse)
async def save_reflection(
    session_id: uuid.UUID,
    req: SaveSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Explicitly save the reflection session for permanent retention in user history."""
    session = await _get_user_session(session_id, current_user.id, db)
    session.is_saved = True
    if req.title and req.title.strip():
        session.title = req.title.strip()
    session.updated_at = datetime.now(UTC)

    state = StructuredReflectionState.model_validate(session.current_state)
    await db.flush()
    await db.refresh(session)

    return ReflectionResponse(
        id=session.id,
        initial_situation=session.initial_situation,
        status=session.status,
        is_saved=session.is_saved,
        selected_response_id=session.selected_response_id,
        title=session.title,
        state=state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


@router.get("", response_model=list[SessionSummaryResponse])
async def list_reflections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List explicitly saved reflection sessions belonging to the authenticated user."""
    stmt = (
        select(ReflectionSession)
        .where(
            ReflectionSession.user_id == current_user.id,
            ReflectionSession.is_saved.is_(True),
        )
        .order_by(desc(ReflectionSession.updated_at))
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [
        SessionSummaryResponse(
            id=s.id,
            title=s.title,
            initial_situation=s.initial_situation,
            status=s.status,
            is_saved=s.is_saved,
            selected_response_id=s.selected_response_id,
            created_at=s.created_at,
            updated_at=s.updated_at,
            completed_at=s.completed_at,
        )
        for s in sessions
    ]


@router.get("/{session_id}", response_model=ReflectionResponse)
async def get_reflection(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single reflection session by ID."""
    session = await _get_user_session(session_id, current_user.id, db)
    state = StructuredReflectionState.model_validate(session.current_state)

    return ReflectionResponse(
        id=session.id,
        initial_situation=session.initial_situation,
        status=session.status,
        is_saved=session.is_saved,
        selected_response_id=session.selected_response_id,
        title=session.title,
        state=state,
        created_at=session.created_at,
        updated_at=session.updated_at,
        completed_at=session.completed_at,
    )


@router.delete("/{session_id}", response_model=MessageResponse)
async def delete_reflection(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a reflection session."""
    session = await _get_user_session(session_id, current_user.id, db)
    await db.delete(session)
    await db.flush()
    return MessageResponse(message="Reflection session deleted successfully")
