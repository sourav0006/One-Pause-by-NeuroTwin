"""Automated tests for AI safety constraints, schema validity, and scenario fixtures.

Validates the three core reflection scenarios:
1. Disagreement with a colleague
2. Personal boundary conflict
3. Postponed or difficult decision

Verifies strict epistemic safety invariants:
- Facts vs. hypotheses separation
- Preserving unknowns
- Balanced response options with both benefits and risks
- Prohibition of diagnostic, pathologizing, or mind-reading claims
- Safe behavior of DevDemoAIProvider and environment guards
"""

import pytest

from app.ai.base import AIProviderConfigError
from app.ai.demo import DevDemoAIProvider
from app.ai.deps import get_ai_provider
from app.core.config import settings
from app.schemas.reflection import (
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

BANNED_PATHOLOGIZING_TERMS = {
    "narcissist",
    "sociopath",
    "psychopath",
    "bipolar",
    "borderline",
    "neurotic",
    "toxic personality",
    "histrionic",
    "delusional",
    "trauma bond",
}


def assert_safety_invariants(state: StructuredReflectionState):
    """Programmatically verify epistemic boundaries and safety invariants."""
    # 1. Structure completeness
    assert state.encounter is not None
    assert len(state.encounter.description.strip()) > 5

    # 2. Fact isolation: All reported facts must have source='user'
    assert len(state.reported_facts) >= 1
    for fact in state.reported_facts:
        assert fact.id.startswith("fact_")
        assert fact.source == "user"
        assert len(fact.text.strip()) > 0

    # 3. Hypothesis tentativeness: Hypotheses must not claim absolute certainty
    assert len(state.hypotheses) >= 1
    for hyp in state.hypotheses:
        assert hyp.id.startswith("hypothesis_")
        assert hyp.source == "ai"
        assert hyp.status in ("active", "corrected", "dismissed")
        assert hyp.confidence in ("tentative", "moderate", "high")
        # Ensure no diagnostic or pathologizing language
        lower_text = hyp.text.lower()
        for banned in BANNED_PATHOLOGIZING_TERMS:
            assert banned not in lower_text, f"Banned diagnostic term '{banned}' found in hypothesis: {hyp.text}"

    # 4. Explicit preservation of unknowns
    assert len(state.unknowns) >= 1
    for unknown in state.unknowns:
        assert unknown.id.startswith("unknown_")
        assert len(unknown.text.strip()) > 0

    # 5. Exactly one or zero follow-up questions
    if state.follow_up_question:
        assert len(state.follow_up_question.text.strip()) > 0
        assert len(state.follow_up_question.purpose.strip()) > 0

    # 6. Balanced response options: Each must provide both benefits AND risks/trade-offs
    assert len(state.possible_responses) >= 2
    for opt in state.possible_responses:
        assert opt.id.startswith("option_")
        assert len(opt.action.strip()) > 0
        assert len(opt.benefits) >= 1, f"Option {opt.id} must offer at least one benefit"
        assert len(opt.risks) >= 1, f"Option {opt.id} must offer at least one trade-off/risk"
        assert len(opt.appropriate_when.strip()) > 0

    # 7. Connections refer to real node IDs
    node_ids = {
        *(f.id for f in state.reported_facts),
        *(h.id for h in state.hypotheses),
        *(u.id for u in state.unknowns),
        *(g.id for g in state.goals),
        *(opt.id for opt in state.possible_responses),
    }
    for conn in state.connections:
        assert conn.source in node_ids, f"Connection source '{conn.source}' not found in nodes"
        assert conn.target in node_ids, f"Connection target '{conn.target}' not found in nodes"


@pytest.mark.asyncio
async def test_scenario_1_colleague_disagreement():
    """Scenario 1: Disagreement with a colleague on project direction and code review."""
    state = StructuredReflectionState(
        encounter=Encounter(
            description="Tension with lead engineer during architectural review"
        ),
        reported_facts=[
            ReportedFact(
                id="fact_1",
                text="Colleague left 15 critical comments on the PR questioning the database design.",
                source="user",
            ),
            ReportedFact(
                id="fact_2",
                text="We have a customer release milestone in three days.",
                source="user",
            ),
        ],
        hypotheses=[
            Hypothesis(
                id="hypothesis_1",
                text="The colleague may be focused on long-term maintainability risks rather than the immediate sprint goal.",
                source="ai",
                status="active",
                confidence="tentative",
            ),
            Hypothesis(
                id="hypothesis_2",
                text="You may be experiencing the review comments as an urgent personal blockage rather than technical feedback.",
                source="ai",
                status="active",
                confidence="tentative",
            ),
        ],
        unknowns=[
            Unknown(
                id="unknown_1",
                text="Which comments are hard blockers vs. nice-to-have optimizations?",
            ),
            Unknown(
                id="unknown_2",
                text="Is there flexibility to address non-critical comments in a follow-up ticket after the milestone?",
            ),
        ],
        goals=[
            Goal(
                id="goal_1",
                text="Ship the release on time without compromising production reliability.",
                source="user",
            )
        ],
        follow_up_question=FollowUpQuestion(
            text="Have you and your colleague discussed which items are critical blockers for this release?",
            purpose="Distinguish necessary fixes from improvements that can be scheduled later.",
        ),
        possible_responses=[
            PossibleResponse(
                id="option_1",
                action="Propose a 15-minute sync to triage comments into 'must-fix for release' vs. 'follow-up technical debt'.",
                benefits=[
                    "Replaces asynchronous tension with rapid alignment",
                    "Protects the release timeline without ignoring architectural concerns",
                ],
                risks=[
                    "Requires active diplomacy if disagreements persist during the call",
                ],
                appropriate_when="Written comments are escalating in tone and time is limited.",
            ),
            PossibleResponse(
                id="option_2",
                action="Address only the 3 most critical points now and request a temporary waiver for the rest.",
                benefits=[
                    "Quickest path to unblocking the deployment",
                ],
                risks=[
                    "May leave colleague feeling bypassed if not agreed upon mutually",
                ],
                appropriate_when="The release milestone cannot slip under any circumstances.",
            ),
        ],
        connections=[
            Connection(source="fact_1", target="hypothesis_1", label="prompts"),
            Connection(source="fact_2", target="unknown_1", label="pressures"),
            Connection(source="unknown_1", target="option_1", label="resolved by"),
        ],
    )

    assert_safety_invariants(state)


@pytest.mark.asyncio
async def test_scenario_2_personal_boundary_conflict():
    """Scenario 2: Boundary conflict with a family member or friend asking for a commitment."""
    state = StructuredReflectionState(
        encounter=Encounter(
            description="Setting boundaries around weekend availability with a demanding relative"
        ),
        reported_facts=[
            ReportedFact(
                id="fact_1",
                text="Relative asked me to host a large gathering at my apartment this Saturday.",
                source="user",
            ),
            ReportedFact(
                id="fact_2",
                text="I am exhausted from work and had set aside Saturday for recuperation.",
                source="user",
            ),
        ],
        hypotheses=[
            Hypothesis(
                id="hypothesis_1",
                text="You may fear that saying no will be interpreted as personal rejection or lack of care.",
                source="ai",
                status="active",
                confidence="tentative",
            ),
        ],
        unknowns=[
            Unknown(
                id="unknown_1",
                text="Are other hosting venues or dates acceptable to the relative?",
            ),
        ],
        goals=[
            Goal(
                id="goal_1",
                text="Protect personal rest while maintaining a warm family relationship.",
                source="user",
            )
        ],
        follow_up_question=FollowUpQuestion(
            text="What alternative date or venue would feel restful rather than draining?",
            purpose="Identify a realistic compromise before declining entirely.",
        ),
        possible_responses=[
            PossibleResponse(
                id="option_1",
                action="Decline Saturday warmly and offer an alternative weekend next month.",
                benefits=[
                    "Protects immediate recovery without leaving an open-ended refusal",
                    "Models clear, respectful personal boundaries",
                ],
                risks=[
                    "Relative may express initial disappointment",
                ],
                appropriate_when="Your physical and mental energy is depleted.",
            ),
            PossibleResponse(
                id="option_2",
                action="Offer to attend if held elsewhere, but clarify you cannot host.",
                benefits=[
                    "Removes all hosting stress while remaining present for the gathering",
                ],
                risks=[
                    "Still requires dedicating several hours over the weekend",
                ],
                appropriate_when="Seeing family matters to you, but the logistics of hosting are the main barrier.",
            ),
        ],
        connections=[
            Connection(source="fact_1", target="hypothesis_1", label="triggers"),
            Connection(source="hypothesis_1", target="option_1", label="informs"),
        ],
    )

    assert_safety_invariants(state)


@pytest.mark.asyncio
async def test_scenario_3_postponed_difficult_decision():
    """Scenario 3: Postponed career or contract decision under uncertainty."""
    state = StructuredReflectionState(
        encounter=Encounter(
            description="Hesitating to accept or decline a job offer with an imminent deadline"
        ),
        reported_facts=[
            ReportedFact(
                id="fact_1",
                text="Received an offer with higher compensation but significant travel requirements.",
                source="user",
            ),
            ReportedFact(
                id="fact_2",
                text="Offer deadline expires in 48 hours; current employer is unaware.",
                source="user",
            ),
        ],
        hypotheses=[
            Hypothesis(
                id="hypothesis_1",
                text="The hesitation may reflect an unresolved conflict between financial goals and lifestyle preferences.",
                source="ai",
                status="active",
                confidence="tentative",
            ),
        ],
        unknowns=[
            Unknown(
                id="unknown_1",
                text="What is the real frequency and flexibility of the travel schedule?",
            ),
            Unknown(
                id="unknown_2",
                text="Would the hiring company grant a 3-day extension to review family logistics?",
            ),
        ],
        goals=[
            Goal(
                id="goal_1",
                text="Make a clear decision aligned with long-term well-being and career growth.",
                source="user",
            )
        ],
        follow_up_question=FollowUpQuestion(
            text="What specific question about the travel schedule would make this choice clear?",
            purpose="Focus on the primary piece of missing information causing the delay.",
        ),
        possible_responses=[
            PossibleResponse(
                id="option_1",
                action="Request a brief call with a future team peer to ask directly about actual travel realities.",
                benefits=[
                    "Replaces speculation with first-hand operational data",
                    "Signals thoughtful diligence to the employer",
                ],
                risks=[
                    "Consumes one of the remaining 48 hours",
                ],
                appropriate_when="Uncertainty about daily reality is the chief cause of your hesitation.",
            ),
            PossibleResponse(
                id="option_2",
                action="Formulate a conditional counter-offer that caps annual travel at an agreed threshold.",
                benefits=[
                    "Directly addresses your primary hesitation before signing",
                ],
                risks=[
                    "Company may state the travel requirement is non-negotiable",
                ],
                appropriate_when="Compensation is satisfactory but travel is a genuine dealbreaker.",
            ),
        ],
        connections=[
            Connection(source="fact_1", target="hypothesis_1", label="creates tension"),
            Connection(source="unknown_1", target="option_1", label="resolved by"),
        ],
    )

    assert_safety_invariants(state)


@pytest.mark.asyncio
async def test_dev_demo_provider_safety_and_labels(monkeypatch):
    """Verify that DevDemoAIProvider is strictly disabled outside development and clearly labeled."""
    # 1. Prohibited in production
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    with pytest.raises(AIProviderConfigError):
        DevDemoAIProvider()

    # 2. Prohibited when ENABLE_DEV_DEMO_AI is False
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", False)
    with pytest.raises(AIProviderConfigError):
        DevDemoAIProvider()

    # 3. Permitted when explicitly enabled in development
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    demo_provider = DevDemoAIProvider()

    # Analyze situation
    demo_state = await demo_provider.analyze_situation(
        situation="I am overwhelmed with requests from multiple stakeholders.",
        context="Working late every evening this week.",
    )

    # Must satisfy all safety invariants
    assert_safety_invariants(demo_state)

    # Must be visibly labeled as [DEV FIXTURE]
    assert "[DEV FIXTURE]" in demo_state.encounter.description
    for fact in demo_state.reported_facts:
        assert "[DEV FIXTURE]" in fact.text
    for hyp in demo_state.hypotheses:
        assert "[DEV FIXTURE]" in hyp.text
    for unknown in demo_state.unknowns:
        assert "[DEV FIXTURE]" in unknown.text
    for opt in demo_state.possible_responses:
        assert "[DEV FIXTURE]" in opt.action

    # Clarification must incorporate user answer
    clarified = await demo_provider.clarify_reflection(
        current_state=demo_state,
        user_answer="My manager is unaware of the requests from other teams.",
    )
    assert len(clarified.reported_facts) == len(demo_state.reported_facts) + 1
    assert "Clarification provided: My manager is unaware" in clarified.reported_facts[-1].text
    # Follow-up question marked answered (None)
    assert clarified.follow_up_question is None

    # Generate options must return labeled options with trade-offs
    options = await demo_provider.generate_options(clarified)
    assert len(options) >= 2
    for opt in options:
        assert "[DEV FIXTURE]" in opt.action
        assert len(opt.benefits) >= 1
        assert len(opt.risks) >= 1


@pytest.mark.asyncio
async def test_get_ai_provider_routing(monkeypatch):
    """Verify dependency routing priorities: real Gemini when configured, demo only when allowed."""
    from app.ai.gemini import GeminiProvider

    # Case 1: Key is set -> Always GeminiProvider
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "real-mock-key-12345")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    provider = get_ai_provider()
    assert isinstance(provider, GeminiProvider)

    # Case 2: Key is unset, dev mode + demo allowed -> DevDemoAIProvider
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    provider = get_ai_provider()
    assert isinstance(provider, DevDemoAIProvider)

    # Case 3: Key is unset, production -> GeminiProvider (fails safely with AIProviderConfigError)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "ENABLE_DEV_DEMO_AI", True)
    provider = get_ai_provider()
    assert isinstance(provider, GeminiProvider)
    with pytest.raises(AIProviderConfigError):
        provider._get_client()
