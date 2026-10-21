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
    ReflectionResponse,
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
        )
    except AIProviderException as e:
        _handle_ai_exception(e)

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

    current_state = StructuredReflectionState.model_validate(session.current_state)

    try:
        updated_state = await ai_provider.clarify_reflection(
            current_state=current_state,
            user_answer=req.answer,
        )
    except AIProviderException as e:
        _handle_ai_exception(e)

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
    state = StructuredReflectionState.model_validate(session.current_state)

    try:
        new_options = await ai_provider.generate_options(state)
        state.possible_responses = new_options
    except AIProviderException as e:
        _handle_ai_exception(e)

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
    session.status = "completed"
    if req.selected_option_id:
        session.selected_response_id = req.selected_option_id
    session.completed_at = datetime.now(UTC)
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
