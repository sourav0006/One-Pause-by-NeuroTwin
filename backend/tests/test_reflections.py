import uuid

import pytest
from httpx import AsyncClient

from app.ai.base import (
    AIProviderConfigError,
    AIProviderUnavailableError,
    AIProviderValidationError,
    BaseAIProvider,
)
from app.ai.deps import get_ai_provider
from app.main import app
from app.schemas.reflection import (
    BehaviouralAnswer,
    BehaviouralQuestion,
    Connection,
    Encounter,
    FollowUpQuestion,
    Goal,
    Hypothesis,
    PossibleResponse,
    ReportedFact,
    StructuredReflectionState,
    Unknown,
)


class MockAIProvider(BaseAIProvider):
    """Mock AI Provider returning validated sample reflection data."""

    def __init__(
        self, should_fail_config=False, should_fail_unavailable=False, should_fail_validation=False
    ):
        self.should_fail_config = should_fail_config
        self.should_fail_unavailable = should_fail_unavailable
        self.should_fail_validation = should_fail_validation

    async def generate_behavioural_questions(
        self, situation: str, context: str | None = None
    ) -> list[BehaviouralQuestion]:
        if self.should_fail_config:
            raise AIProviderConfigError()
        if self.should_fail_unavailable:
            raise AIProviderUnavailableError()
        if self.should_fail_validation:
            raise AIProviderValidationError()
        return [
            BehaviouralQuestion(
                id="q1",
                theme="Immediate Focus",
                question="What felt most prominent in shaping your immediate reaction?",
                options=["The deadline", "The tone", "None of these"],
                placeholder="Details...",
            ),
            BehaviouralQuestion(
                id="q2",
                theme="Influencing Factors",
                question="Might any personal or situational factors have influenced your capacity?",
                options=["Heavy workload", "Fatigue", "None of these"],
                placeholder="Details...",
            ),
            BehaviouralQuestion(
                id="q3",
                theme="Prior Habits",
                question="How have you typically tended to respond in similar moments?",
                options=["Saying yes quickly", "Delaying", "None of these"],
                placeholder="Details...",
            ),
        ]

    async def analyze_situation(
        self,
        situation: str,
        context: str | None = None,
        behavioural_answers: list[BehaviouralAnswer] | None = None,
    ) -> StructuredReflectionState:
        if self.should_fail_config:
            raise AIProviderConfigError()
        if self.should_fail_unavailable:
            raise AIProviderUnavailableError()
        if self.should_fail_validation:
            raise AIProviderValidationError()

        return StructuredReflectionState(
            encounter=Encounter(description="Manager assigning overload while already at capacity"),
            reported_facts=[
                ReportedFact(
                    id="fact_1",
                    text="User is currently overloaded with existing workload",
                    source="user",
                ),
                ReportedFact(id="fact_2", text="Manager assigned another task", source="user"),
            ],
            hypotheses=[
                Hypothesis(
                    id="hypothesis_1",
                    text="User may be concerned about disappointing manager or harming professional reputation",
                    source="ai",
                    status="active",
                    confidence="tentative",
                ),
                Hypothesis(
                    id="hypothesis_2",
                    text="Manager might assume user has bandwidth because previous limits were not communicated",
                    source="ai",
                    status="active",
                    confidence="tentative",
                ),
            ],
            unknowns=[
                Unknown(
                    id="unknown_1",
                    text="How flexible is the manager regarding deadlines or priorities?",
                ),
                Unknown(id="unknown_2", text="Can the task be delegated or postponed?"),
            ],
            goals=[
                Goal(id="goal_1", text="Maintain good standing without burning out", source="user"),
            ],
            follow_up_question=FollowUpQuestion(
                text="What is your primary concern if you inform your manager about your current capacity?",
                purpose="Clarify perceived stakes and priority",
            ),
            possible_responses=[
                PossibleResponse(
                    id="option_1",
                    action="Transparent priority realignment: Show current commitments and ask which takes precedence.",
                    benefits=["Maintains professionalism", "Sets transparent boundaries"],
                    risks=["Manager might feel inconvenienced initially"],
                    appropriate_when="Manager is reasonable and values project delivery quality",
                ),
                PossibleResponse(
                    id="option_2",
                    action="Accept with adjusted timeline: Agree to take the task with a later delivery date.",
                    benefits=["Avoids direct confrontation", "Secures extra time"],
                    risks=["Still increases overall workload"],
                    appropriate_when="Deadlines are flexible",
                ),
                PossibleResponse(
                    id="option_3",
                    action="Pause and reflect: Request 2 hours to review schedule before giving a commitment.",
                    benefits=["Prevents impulsive yes", "Allows deliberate response"],
                    risks=["Delays immediate answer"],
                    appropriate_when="Feeling rushed or emotionally pressured",
                ),
            ],
            connections=[
                Connection(source="fact_1", target="hypothesis_1", label="influences concern"),
                Connection(source="hypothesis_1", target="unknown_1", label="hinges on"),
                Connection(source="unknown_1", target="option_1", label="informs"),
            ],
            behavioural_answers=behavioural_answers or [],
        )

    async def clarify_reflection(
        self, current_state: StructuredReflectionState, user_answer: str
    ) -> StructuredReflectionState:
        updated = current_state.model_copy(deep=True)
        # Append answer as user fact
        new_fact_id = f"fact_{len(updated.reported_facts) + 1}"
        updated.reported_facts.append(
            ReportedFact(id=new_fact_id, text=f"Clarification: {user_answer}", source="user")
        )
        # Adjust hypothesis if user confirms or clarifies
        if updated.hypotheses:
            updated.hypotheses[0].confidence = "moderate"
            updated.hypotheses[0].user_note = "Confirmed during clarification"
        return updated

    async def generate_options(
        self, current_state: StructuredReflectionState
    ) -> list[PossibleResponse]:
        return current_state.possible_responses


@pytest.fixture
async def auth_headers(client: AsyncClient):
    """Register and login a test user, returning Bearer auth headers."""
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def other_user_headers(client: AsyncClient):
    """Register a second user for cross-user permission testing."""
    email = f"other_{uuid.uuid4().hex[:8]}@example.com"
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_analyze_situation_success(client: AsyncClient, auth_headers: dict):
    mock_provider = MockAIProvider()
    app.dependency_overrides[get_ai_provider] = lambda: mock_provider

    payload = {
        "situation": "My manager has given me another task, but I'm already overloaded.",
        "context": "I value professional reputation.",
    }

    res = await client.post("/api/v1/reflections/analyze", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()

    assert "id" in data
    assert data["initial_situation"] == payload["situation"]
    assert data["status"] == "in_progress"
    state = data["state"]
    assert len(state["reported_facts"]) == 2
    assert len(state["hypotheses"]) == 2
    assert len(state["unknowns"]) == 2
    assert state["follow_up_question"] is not None
    assert len(state["possible_responses"]) == 3
    assert len(state["connections"]) == 3

    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_ai_provider_error_handling(client: AsyncClient, auth_headers: dict):
    # Test 1: Config error (e.g. missing API key)
    app.dependency_overrides[get_ai_provider] = lambda: MockAIProvider(should_fail_config=True)
    res_cfg = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "My manager assigned another task but I am overloaded."},
        headers=auth_headers,
    )
    assert res_cfg.status_code == 503
    assert res_cfg.json()["detail"]["code"] == "AI_PROVIDER_NOT_CONFIGURED"

    # Test 2: Unavailable / Rate limit error
    app.dependency_overrides[get_ai_provider] = lambda: MockAIProvider(should_fail_unavailable=True)
    res_unavail = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "My manager assigned another task but I am overloaded."},
        headers=auth_headers,
    )
    assert res_unavail.status_code == 503
    assert res_unavail.json()["detail"]["code"] == "AI_PROVIDER_UNAVAILABLE"

    # Test 3: Validation error
    app.dependency_overrides[get_ai_provider] = lambda: MockAIProvider(should_fail_validation=True)
    res_val = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "My manager assigned another task but I am overloaded."},
        headers=auth_headers,
    )
    assert res_val.status_code == 502
    assert res_val.json()["detail"]["code"] == "AI_OUTPUT_VALIDATION_ERROR"

    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_clarification_and_hypothesis_patch(client: AsyncClient, auth_headers: dict):
    mock_provider = MockAIProvider()
    app.dependency_overrides[get_ai_provider] = lambda: mock_provider

    # 1. Analyze initial situation
    init_res = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "My manager gave me another urgent deadline."},
        headers=auth_headers,
    )
    session_id = init_res.json()["id"]

    # 2. Submit clarification answer
    clarify_res = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "I am worried he might think I can't handle senior responsibilities."},
        headers=auth_headers,
    )
    assert clarify_res.status_code == 200
    clarified_state = clarify_res.json()["state"]
    # Verify new user-reported fact was added
    assert len(clarified_state["reported_facts"]) == 3
    assert "Clarification:" in clarified_state["reported_facts"][-1]["text"]

    # 3. Patch hypothesis to 'dismissed'
    hyp_id = clarified_state["hypotheses"][1]["id"]
    patch_res = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/{hyp_id}",
        json={"status": "dismissed"},
        headers=auth_headers,
    )
    assert patch_res.status_code == 200
    updated_hyp = next(h for h in patch_res.json()["state"]["hypotheses"] if h["id"] == hyp_id)
    assert updated_hyp["status"] == "dismissed"

    # 4. Patch hypothesis with user correction
    hyp_0_id = clarified_state["hypotheses"][0]["id"]
    patch_corr = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/{hyp_0_id}",
        json={
            "status": "corrected",
            "corrected_text": "Actually I care more about work quality than perception.",
        },
        headers=auth_headers,
    )
    assert patch_corr.status_code == 200
    updated_hyp_0 = next(h for h in patch_corr.json()["state"]["hypotheses"] if h["id"] == hyp_0_id)
    assert updated_hyp_0["status"] == "corrected"
    assert updated_hyp_0["user_note"] == "Actually I care more about work quality than perception."

    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_session_ownership_and_deletion(
    client: AsyncClient,
    auth_headers: dict,
    other_user_headers: dict,
):
    mock_provider = MockAIProvider()
    app.dependency_overrides[get_ai_provider] = lambda: mock_provider

    # User A creates a reflection
    init_res = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Private reflection for user A."},
        headers=auth_headers,
    )
    session_id = init_res.json()["id"]

    # User B tries to view User A's reflection -> 404
    other_get = await client.get(
        f"/api/v1/reflections/{session_id}",
        headers=other_user_headers,
    )
    assert other_get.status_code == 404

    # User B tries to patch hypothesis in User A's reflection -> 404
    other_patch = await client.patch(
        f"/api/v1/reflections/{session_id}/hypotheses/hypothesis_1",
        json={"status": "dismissed"},
        headers=other_user_headers,
    )
    assert other_patch.status_code == 404

    # User B tries to delete User A's reflection -> 404
    other_delete = await client.delete(
        f"/api/v1/reflections/{session_id}",
        headers=other_user_headers,
    )
    assert other_delete.status_code == 404

    # User A can save their reflection
    save_res = await client.post(
        f"/api/v1/reflections/{session_id}/save",
        json={"title": "Custom Overload Reflection"},
        headers=auth_headers,
    )
    assert save_res.status_code == 200
    assert save_res.json()["title"] == "Custom Overload Reflection"

    # User A can list saved reflections
    list_res = await client.get("/api/v1/reflections", headers=auth_headers)
    assert list_res.status_code == 200
    assert any(s["id"] == session_id for s in list_res.json())

    # User A deletes their reflection
    del_res = await client.delete(
        f"/api/v1/reflections/{session_id}",
        headers=auth_headers,
    )
    assert del_res.status_code == 200

    # Getting deleted reflection -> 404
    get_del = await client.get(
        f"/api/v1/reflections/{session_id}",
        headers=auth_headers,
    )
    assert get_del.status_code == 404

    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_saved_vs_unsaved_isolation(client: AsyncClient, auth_headers: dict):
    mock_provider = MockAIProvider()
    app.dependency_overrides[get_ai_provider] = lambda: mock_provider

    # 1. Create a reflection (default is unsaved)
    init_res = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Testing unsaved vs saved privacy."},
        headers=auth_headers,
    )
    assert init_res.status_code == 201
    session_id = init_res.json()["id"]
    assert init_res.json()["is_saved"] is False

    # 2. GET /reflections must NOT list unsaved session (PRD §7 FR-10 & §12.2)
    list_before = await client.get("/api/v1/reflections", headers=auth_headers)
    assert list_before.status_code == 200
    assert not any(s["id"] == session_id for s in list_before.json())

    # 3. Explicitly save session
    save_res = await client.post(
        f"/api/v1/reflections/{session_id}/save",
        json={"title": "Now Explicitly Saved"},
        headers=auth_headers,
    )
    assert save_res.status_code == 200
    assert save_res.json()["is_saved"] is True

    # 4. GET /reflections now lists the session
    list_after = await client.get("/api/v1/reflections", headers=auth_headers)
    assert list_after.status_code == 200
    assert any(s["id"] == session_id for s in list_after.json())

    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_completion_with_and_without_selected_response(
    client: AsyncClient, auth_headers: dict
):
    mock_provider = MockAIProvider()
    app.dependency_overrides[get_ai_provider] = lambda: mock_provider

    # 1. Create reflection
    init_res = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Examining completion workflow with trade-offs."},
        headers=auth_headers,
    )
    session_id = init_res.json()["id"]

    # 2. Complete WITHOUT selecting option (PRD §7 FR-08 & FR-09)
    comp_no_opt = await client.post(
        f"/api/v1/reflections/{session_id}/complete",
        json={},
        headers=auth_headers,
    )
    assert comp_no_opt.status_code == 200
    assert comp_no_opt.json()["status"] == "completed"
    assert comp_no_opt.json()["selected_response_id"] is None
    assert comp_no_opt.json()["completed_at"] is not None
    # Completion does not make it permanently saved without explicit user save
    assert comp_no_opt.json()["is_saved"] is False

    # 3. Complete WITH selected option
    comp_with_opt = await client.post(
        f"/api/v1/reflections/{session_id}/complete",
        json={"selected_option_id": "option_1"},
        headers=auth_headers,
    )
    assert comp_with_opt.status_code == 200
    assert comp_with_opt.json()["selected_response_id"] == "option_1"

    app.dependency_overrides.pop(get_ai_provider, None)


@pytest.mark.asyncio
async def test_behavioural_questions_workflow_and_persistence(
    client: AsyncClient, auth_headers: dict
):
    mock_provider = MockAIProvider()
    app.dependency_overrides[get_ai_provider] = lambda: mock_provider

    # 1. Test POST /questions returns exactly 3 questions
    q_res = await client.post(
        "/api/v1/reflections/questions",
        json={"situation": "Director demanded an emergency deliverable over the weekend without warning."},
        headers=auth_headers,
    )
    assert q_res.status_code == 200
    questions_data = q_res.json()["questions"]
    assert len(questions_data) == 3
    assert [q["id"] for q in questions_data] == ["q1", "q2", "q3"]
    assert all("question" in q and "theme" in q and "options" in q for q in questions_data)

    # 2. Test POST /analyze with behavioural answers
    answers = [
        {
            "question_id": "q1",
            "theme": "Immediate Focus",
            "question": questions_data[0]["question"],
            "answer": "The sudden expectation and lack of respect for personal time.",
        },
        {
            "question_id": "q2",
            "theme": "Influencing Factors",
            "question": questions_data[1]["question"],
            "answer": "Severe sleep debt and back-to-back delivery deadlines.",
        },
        {
            "question_id": "q3",
            "theme": "Prior Habits",
            "question": questions_data[2]["question"],
            "answer": "Historically I say yes to avoid confrontation, then resent it later.",
        },
    ]

    analyze_res = await client.post(
        "/api/v1/reflections/analyze",
        json={
            "situation": "Director demanded an emergency deliverable over the weekend without warning.",
            "behavioural_answers": answers,
        },
        headers=auth_headers,
    )
    assert analyze_res.status_code == 201
    res_data = analyze_res.json()
    session_id = res_data["id"]
    state = res_data["state"]

    assert len(state["behavioural_answers"]) == 3
    assert state["behavioural_answers"][0]["question_id"] == "q1"
    assert state["behavioural_answers"][1]["answer"] == "Severe sleep debt and back-to-back delivery deadlines."

    # 3. Test clarify preserves behavioural answers
    clarify_res = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "My primary goal is to protect my weekend while proposing a Monday morning delivery."},
        headers=auth_headers,
    )
    assert clarify_res.status_code == 200
    clarified_state = clarify_res.json()["state"]
    assert len(clarified_state["behavioural_answers"]) == 3
    assert clarified_state["behavioural_answers"][0]["theme"] == "Immediate Focus"

    # 4. Save the session
    save_res = await client.post(
        f"/api/v1/reflections/{session_id}/save",
        json={},
        headers=auth_headers,
    )
    assert save_res.status_code == 200
    assert save_res.json()["is_saved"] is True

    # 5. Fetch session directly (reopen) and verify behavioural answers are intact
    fetch_res = await client.get(
        f"/api/v1/reflections/{session_id}",
        headers=auth_headers,
    )
    assert fetch_res.status_code == 200
    reopened = fetch_res.json()
    assert reopened["is_saved"] is True
    assert len(reopened["state"]["behavioural_answers"]) == 3
    assert reopened["state"]["behavioural_answers"][2]["answer"] == (
        "Historically I say yes to avoid confrontation, then resent it later."
    )

    app.dependency_overrides.pop(get_ai_provider, None)

