import uuid

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.ai.base import BaseAIProvider
from app.ai.deps import get_ai_provider
from app.main import app
from app.schemas.reflection import (
    BehaviouralAnswer,
    BehaviouralQuestion,
    Encounter,
    FollowUpQuestion,
    Goal,
    Hypothesis,
    OptionsResponse,
    PossibleResponse,
    ReportedFact,
    StructuredReflectionState,
    Unknown,
)


def _make_sample_option(opt_id: str, action: str) -> PossibleResponse:
    return PossibleResponse(
        id=opt_id,
        action=action,
        benefits=["Clear benefit"],
        risks=["Known risk"],
        appropriate_when="Context is suitable",
    )


def _make_sample_state(num_options: int = 3) -> dict:
    options = [
        _make_sample_option(f"option_{i}", f"Action step {i}")
        for i in range(1, num_options + 1)
    ]
    return {
        "encounter": Encounter(description="Testing response option requirements"),
        "reported_facts": [ReportedFact(id="fact_1", text="Reported fact", source="user")],
        "hypotheses": [
            Hypothesis(
                id="hypothesis_1",
                text="Tentative hypothesis",
                source="ai",
                status="active",
                confidence="tentative",
            )
        ],
        "unknowns": [Unknown(id="unknown_1", text="Unanswered context")],
        "goals": [Goal(id="goal_1", text="Core goal", source="user")],
        "follow_up_question": FollowUpQuestion(
            text="Clarifying question?", purpose="Assess priorities"
        ),
        "possible_responses": options,
        "connections": [],
        "behavioural_answers": [],
    }


# ============================================================================
# 1. Pydantic Schema Validation Tests
# ============================================================================


def test_schema_accepts_exactly_three_options():
    """Verify that StructuredReflectionState and OptionsResponse accept exactly 3 options."""
    state_data = _make_sample_state(3)
    state = StructuredReflectionState(**state_data)
    assert len(state.possible_responses) == 3

    options = [_make_sample_option(f"option_{i}", f"Action {i}") for i in range(1, 4)]
    opts_response = OptionsResponse(possible_responses=options)
    assert len(opts_response.possible_responses) == 3


@pytest.mark.parametrize("count", [0, 1, 2, 4, 5])
def test_schema_rejects_invalid_option_counts_in_state(count: int):
    """Verify StructuredReflectionState rejects fewer or more than 3 options."""
    state_data = _make_sample_state(count)
    with pytest.raises(ValidationError) as exc_info:
        StructuredReflectionState(**state_data)
    errors = exc_info.value.errors()
    assert any("possible_responses" in err["loc"] for err in errors)


@pytest.mark.parametrize("count", [0, 1, 2, 4, 5])
def test_schema_rejects_invalid_option_counts_in_options_response(count: int):
    """Verify OptionsResponse rejects fewer or more than 3 options."""
    options = [_make_sample_option(f"option_{i}", f"Action {i}") for i in range(1, count + 1)]
    with pytest.raises(ValidationError) as exc_info:
        OptionsResponse(possible_responses=options)
    errors = exc_info.value.errors()
    assert any("possible_responses" in err["loc"] for err in errors)


def test_schema_validate_assignment_rejects_mutation_to_invalid_count():
    """Verify that mutating possible_responses on an existing state raises ValidationError."""
    state = StructuredReflectionState(**_make_sample_state(3))
    assert len(state.possible_responses) == 3

    with pytest.raises(ValidationError):
        state.possible_responses = [
            _make_sample_option("option_1", "Action 1"),
            _make_sample_option("option_2", "Action 2"),
        ]

    with pytest.raises(ValidationError):
        state.possible_responses = [
            _make_sample_option(f"option_{i}", f"Action {i}") for i in range(1, 5)
        ]


# ============================================================================
# 2. Clarification & Regeneration API Integration Tests
# ============================================================================


class ControlledOptionsMockAIProvider(BaseAIProvider):
    """Mock provider allowing explicit control over returned response options."""

    def __init__(self, returned_options: list[PossibleResponse]):
        self.returned_options = returned_options

    async def generate_behavioural_questions(
        self, situation: str, context: str | None = None
    ) -> list[BehaviouralQuestion]:
        return [
            BehaviouralQuestion(id="q1", theme="Trigger", question="Q1", options=["A", "B"]),
            BehaviouralQuestion(id="q2", theme="Context", question="Q2", options=["C", "D"]),
            BehaviouralQuestion(id="q3", theme="Habits", question="Q3", options=["E", "F"]),
        ]

    async def analyze_situation(
        self,
        situation: str,
        context: str | None = None,
        behavioural_answers: list[BehaviouralAnswer] | None = None,
    ) -> StructuredReflectionState:
        # Initial analysis always provides 3 baseline distinct options
        initial_options = [
            _make_sample_option("option_1", "Original Action 1: Direct discussion"),
            _make_sample_option("option_2", "Original Action 2: Deliberate pause"),
            _make_sample_option("option_3", "Original Action 3: Written proposal"),
        ]
        data = _make_sample_state(3)
        data["possible_responses"] = initial_options
        return StructuredReflectionState(**data)

    async def clarify_reflection(
        self, current_state: StructuredReflectionState, user_answer: str
    ) -> StructuredReflectionState:
        updated = current_state.model_copy(deep=True)
        # Note: if returned_options has != 3, we bypass model validation here to test route handling
        object.__setattr__(updated, "possible_responses", list(self.returned_options))
        return updated

    async def generate_options(
        self, current_state: StructuredReflectionState
    ) -> list[PossibleResponse]:
        return list(self.returned_options)


@pytest.fixture
async def auth_headers(client: AsyncClient):
    """Register and login a test user, returning Bearer auth headers."""
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "SecurePassword123!"},
    )
    assert reg_resp.status_code == 201, reg_resp.text
    token = reg_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_clarify_preserves_three_options_when_provider_returns_three(
    client: AsyncClient, auth_headers: dict
):
    """Clarification returns and persists exactly 3 options when AI provides 3."""
    three_options = [
        _make_sample_option("option_1", "Clarified Action 1"),
        _make_sample_option("option_2", "Clarified Action 2"),
        _make_sample_option("option_3", "Clarified Action 3"),
    ]
    provider = ControlledOptionsMockAIProvider(returned_options=three_options)
    app.dependency_overrides[get_ai_provider] = lambda: provider

    # 1. Create reflection session
    create_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Navigating a complex project re-prioritization discussion."},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    # 2. Clarify
    clarify_resp = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "Our team has explicit support from leadership."},
        headers=auth_headers,
    )
    assert clarify_resp.status_code == 200
    state = clarify_resp.json()["state"]
    assert len(state["possible_responses"]) == 3
    assert [o["action"] for o in state["possible_responses"]] == [
        "Clarified Action 1",
        "Clarified Action 2",
        "Clarified Action 3",
    ]


@pytest.mark.asyncio
async def test_clarify_reuses_prior_option_if_ai_returns_two_options(
    client: AsyncClient, auth_headers: dict
):
    """If clarification returns 2 options, route reuses the non-duplicate prior option without fabricating."""
    # AI returns only 2 options during clarification
    two_options = [
        _make_sample_option("option_1", "Original Action 1: Direct discussion"),
        _make_sample_option("option_2", "New Clarified Action: Boundary setting"),
    ]
    provider = ControlledOptionsMockAIProvider(returned_options=two_options)
    app.dependency_overrides[get_ai_provider] = lambda: provider

    # 1. Create session (has 3 baseline options: Original Action 1, 2, and 3)
    create_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Navigating a complex project re-prioritization discussion."},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    # 2. Clarify: AI provided 2, route must preserve/reuse appropriate 3rd option
    clarify_resp = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "The client agreed to extend the deadline."},
        headers=auth_headers,
    )
    assert clarify_resp.status_code == 200
    state = clarify_resp.json()["state"]
    assert len(state["possible_responses"]) == 3
    actions = [o["action"] for o in state["possible_responses"]]
    # Contains the 2 clarified actions + 1 reused prior distinct option
    assert "Original Action 1: Direct discussion" in actions
    assert "New Clarified Action: Boundary setting" in actions
    assert "Original Action 2: Deliberate pause" in actions


@pytest.mark.asyncio
async def test_clarify_fails_explicitly_if_three_options_cannot_be_preserved(
    client: AsyncClient, auth_headers: dict
):
    """If clarification returns only 1 option (so 3 cannot be reached without fabrication), fail explicitly."""
    one_option = [
        _make_sample_option("option_1", "Original Action 1: Direct discussion"),
    ]
    provider = ControlledOptionsMockAIProvider(returned_options=one_option)
    app.dependency_overrides[get_ai_provider] = lambda: provider

    # Create reflection
    create_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Navigating a complex project re-prioritization discussion."},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    # Provider clarify implementation where prior options cannot supply the missing options
    async def mock_clarify_failing(current_state, user_answer):
        updated = current_state.model_copy(deep=True)
        object.__setattr__(current_state, "possible_responses", [])
        object.__setattr__(updated, "possible_responses", [_make_sample_option("opt_1", "Lone option")])
        return updated

    provider.clarify_reflection = mock_clarify_failing

    clarify_resp = await client.post(
        f"/api/v1/reflections/{session_id}/clarify",
        json={"answer": "Some answer"},
        headers=auth_headers,
    )
    assert clarify_resp.status_code == 502
    assert clarify_resp.json()["detail"]["code"] == "AI_VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_refresh_options_returns_exactly_three_options(
    client: AsyncClient, auth_headers: dict
):
    """Option regeneration returns and saves exactly 3 options."""
    three_new_options = [
        _make_sample_option("option_1", "Refreshed Action 1"),
        _make_sample_option("option_2", "Refreshed Action 2"),
        _make_sample_option("option_3", "Refreshed Action 3"),
    ]
    provider = ControlledOptionsMockAIProvider(returned_options=three_new_options)
    app.dependency_overrides[get_ai_provider] = lambda: provider

    create_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Navigating a complex project re-prioritization discussion."},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    refresh_resp = await client.post(
        f"/api/v1/reflections/{session_id}/options",
        headers=auth_headers,
    )
    assert refresh_resp.status_code == 200
    state = refresh_resp.json()["state"]
    assert len(state["possible_responses"]) == 3
    assert [o["action"] for o in state["possible_responses"]] == [
        "Refreshed Action 1",
        "Refreshed Action 2",
        "Refreshed Action 3",
    ]


@pytest.mark.asyncio
async def test_refresh_options_fails_explicitly_if_invalid_count_cannot_be_resolved(
    client: AsyncClient, auth_headers: dict
):
    """Option regeneration fails with 502 if 3 options cannot be provided, without silent persistence."""
    provider = ControlledOptionsMockAIProvider(returned_options=[])
    app.dependency_overrides[get_ai_provider] = lambda: provider

    create_resp = await client.post(
        "/api/v1/reflections/analyze",
        json={"situation": "Navigating a complex project re-prioritization discussion."},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    refresh_resp = await client.post(
        f"/api/v1/reflections/{session_id}/options",
        headers=auth_headers,
    )
    assert refresh_resp.status_code == 502
    assert refresh_resp.json()["detail"]["code"] == "AI_VALIDATION_ERROR"
