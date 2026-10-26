"""Development-only demo AI provider using deterministic fixtures.

This provider is strictly for local demonstration and automated testing when
GEMINI_API_KEY is not configured. It is disabled by default and can NEVER run
in production environments (enforced by settings.ENVIRONMENT check).

All returned nodes and descriptions are visibly labeled with [DEV FIXTURE]
to ensure they are never mistaken for live Gemini model output.
"""

from app.ai.base import AIProviderConfigError, BaseAIProvider
from app.core.config import settings
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


class DevDemoAIProvider(BaseAIProvider):
    """Deterministic development fixture provider for offline UI demonstrations."""

    def __init__(self):
        # Strict safety check: Never permit demo AI in production
        if settings.ENVIRONMENT != "development":
            raise AIProviderConfigError(
                "DevDemoAIProvider is prohibited in non-development environments."
            )
        if not settings.ENABLE_DEV_DEMO_AI:
            raise AIProviderConfigError(
                "Demo AI mode is disabled. Set ENABLE_DEV_DEMO_AI=true in backend/.env for local demo mode, "
                "or configure GEMINI_API_KEY for live reflections."
            )

    async def generate_behavioural_questions(
        self, situation: str, context: str | None = None
    ) -> list[BehaviouralQuestion]:
        """Generate three neutral, concise behavioural questions tailored to the situation."""
        return [
            BehaviouralQuestion(
                id="q1",
                theme="Immediate Focus & Trigger",
                question="Looking back at this moment, what aspect felt most prominent in shaping your immediate reaction?",
                options=[
                    "The compressed deadline or urgency",
                    "How the request was communicated without checking bandwidth",
                    "Conflict with my existing commitments and delivery quality",
                    "None of these / Something else",
                ],
                placeholder="e.g. The sudden expectation to absorb urgent work without discussing tradeoffs...",
            ),
            BehaviouralQuestion(
                id="q2",
                theme="Influencing Factors",
                question="Might any personal or situational factors (such as workload, fatigue, stakes, or pacing) have influenced your capacity in that moment?",
                options=[
                    "Heavy ongoing workload and high delivery expectations",
                    "Pressure to maintain rapport and appear dependable",
                    "Fatigue or lack of buffer time to think clearly",
                    "None of these / I felt rested and composed",
                ],
                placeholder="e.g. High quarterly delivery pressure and worry about burning out...",
            ),
            BehaviouralQuestion(
                id="q3",
                theme="Prior Response Patterns",
                question="When faced with similar priority conflicts or requests in the past, how have you typically tended to respond?",
                options=[
                    "Saying yes quickly to maintain harmony, then feeling overloaded",
                    "Delaying or agonizing over my response before deciding",
                    "Pushing back firmly right away",
                    "It varies depending on the person / None of these",
                ],
                placeholder="e.g. I tend to agree immediately out of habit, then struggle with workload later...",
            ),
        ]

    async def analyze_situation(
        self,
        situation: str,
        context: str | None = None,
        behavioural_answers: list[BehaviouralAnswer] | None = None,
    ) -> StructuredReflectionState:
        """Return a deterministic, structured reflection fixture labeled [DEV FIXTURE]."""
        # Truncate clean snippet for display
        snippet = situation.strip()
        if len(snippet) > 80:
            snippet = snippet[:77] + "..."

        reported_facts = [
            ReportedFact(
                id="fact_1",
                text=f"[DEV FIXTURE] Reported situation: {situation.strip()[:180]}",
                source="user",
            ),
            ReportedFact(
                id="fact_2",
                text=(
                    f"[DEV FIXTURE] Context: {context.strip()[:140]}"
                    if context and context.strip()
                    else "[DEV FIXTURE] The user has paused to evaluate next steps before taking action."
                ),
                source="user",
            ),
        ]

        if behavioural_answers:
            for idx, ans in enumerate(behavioural_answers, start=3):
                reported_facts.append(
                    ReportedFact(
                        id=f"fact_{idx}",
                        text=f"[DEV FIXTURE] Stated {ans.theme.lower()}: {ans.answer.strip()[:140]}",
                        source="user",
                    )
                )

        return StructuredReflectionState(
            encounter=Encounter(
                description=f"[DEV FIXTURE] Pausing to examine: {snippet}"
            ),
            reported_facts=reported_facts,
            hypotheses=[
                Hypothesis(
                    id="hypothesis_1",
                    text="[DEV FIXTURE] Possible interpretation: You may be feeling pressure to protect rapport at the cost of your current capacity.",
                    source="ai",
                    status="active",
                    confidence="tentative",
                    user_note=None,
                ),
                Hypothesis(
                    id="hypothesis_2",
                    text="[DEV FIXTURE] Possible interpretation: The other party may assume you have bandwidth because you haven't explicitly signaled otherwise.",
                    source="ai",
                    status="active",
                    confidence="tentative",
                    user_note=None,
                ),
            ],
            unknowns=[
                Unknown(
                    id="unknown_1",
                    text="[DEV FIXTURE] Unknown: What specific deadline or flexibility exists on the other party's side?",
                ),
                Unknown(
                    id="unknown_2",
                    text="[DEV FIXTURE] Unknown: What would happen if this response was delayed by 24 hours?",
                ),
            ],
            goals=[
                Goal(
                    id="goal_1",
                    text="[DEV FIXTURE] Goal: Respond clearly and professionally without overcommitting.",
                    source="user",
                )
            ],
            follow_up_question=FollowUpQuestion(
                text="[DEV FIXTURE] What is the single most important outcome you need from this interaction?",
                purpose="Clarifying your primary priority helps distinguish between urgent reactions and strategic choices.",
            ),
            possible_responses=[
                PossibleResponse(
                    id="option_1",
                    action="[DEV FIXTURE] Acknowledge receipt now, state when you will provide a full answer, and evaluate tradeoffs calmly.",
                    benefits=[
                        "Buys immediate thinking time without appearing dismissive",
                        "Reduces stress from an urgent impulse",
                    ],
                    risks=[
                        "Requires setting an explicit callback expectation",
                    ],
                    appropriate_when="You need time to check your calendar, priorities, or emotional composure.",
                ),
                PossibleResponse(
                    id="option_2",
                    action="[DEV FIXTURE] State your current workload transparently and offer a prioritized counter-proposal.",
                    benefits=[
                        "Sets clear boundaries with factual workload justification",
                        "Maintains collaborative problem-solving",
                    ],
                    risks=[
                        "May require negotiating what other tasks get postponed",
                    ],
                    appropriate_when="Taking on this commitment would compromise existing commitments or personal health.",
                ),
                PossibleResponse(
                    id="option_3",
                    action="[DEV FIXTURE] Accept with explicit scope limitations and agreed support.",
                    benefits=[
                        "Shows helpfulness while protecting core boundaries",
                    ],
                    risks=[
                        "Still adds some cognitive load",
                    ],
                    appropriate_when="The request is high-priority for the team and you have sufficient buffer.",
                ),
            ],
            connections=[
                Connection(source="fact_1", target="hypothesis_1", label="informs"),
                Connection(source="hypothesis_1", target="unknown_1", label="raises question"),
                Connection(source="hypothesis_2", target="unknown_2", label="suggests checking"),
                Connection(source="goal_1", target="option_2", label="supported by"),
            ],
            behavioural_answers=behavioural_answers or [],
        )

    async def clarify_reflection(
        self, current_state: StructuredReflectionState, user_answer: str
    ) -> StructuredReflectionState:
        """Incorporate clarification answer into deterministic reflection state."""
        new_fact_id = f"fact_{len(current_state.reported_facts) + 1}"
        updated_facts = list(current_state.reported_facts)
        updated_facts.append(
            ReportedFact(
                id=new_fact_id,
                text=f"[DEV FIXTURE] Clarification provided: {user_answer.strip()}",
                source="user",
            )
        )

        # Mark first tentative hypothesis as moderate confidence with user validation
        updated_hypotheses = []
        for h in current_state.hypotheses:
            updated_h = h.model_copy()
            if updated_h.id == "hypothesis_1":
                updated_h.confidence = "moderate"
            updated_hypotheses.append(updated_h)

        # Resolve the follow_up_question since it was answered
        return StructuredReflectionState(
            encounter=current_state.encounter,
            reported_facts=updated_facts,
            hypotheses=updated_hypotheses,
            unknowns=current_state.unknowns,
            goals=current_state.goals,
            follow_up_question=None,  # Answered
            possible_responses=current_state.possible_responses,
            connections=current_state.connections,
            behavioural_answers=current_state.behavioural_answers,
        )

    async def generate_options(
        self, current_state: StructuredReflectionState
    ) -> list[PossibleResponse]:
        """Return deterministic balanced response options labeled [DEV FIXTURE]."""
        return [
            PossibleResponse(
                id="option_1",
                action="[DEV FIXTURE] Acknowledge receipt now, state when you will provide a full answer, and evaluate tradeoffs calmly.",
                benefits=[
                    "Buys immediate thinking time without appearing dismissive",
                    "Reduces stress from an urgent impulse",
                ],
                risks=[
                    "Requires setting an explicit callback expectation",
                ],
                appropriate_when="You need time to check your calendar, priorities, or emotional composure.",
            ),
            PossibleResponse(
                id="option_2",
                action="[DEV FIXTURE] State your current workload transparently and offer a prioritized counter-proposal.",
                benefits=[
                    "Sets clear boundaries with factual workload justification",
                    "Maintains collaborative problem-solving",
                ],
                risks=[
                    "May require negotiating what other tasks get postponed",
                ],
                appropriate_when="Taking on this commitment would compromise existing commitments or personal health.",
            ),
            PossibleResponse(
                id="option_3",
                action="[DEV FIXTURE] Accept with explicit scope limitations and agreed support.",
                benefits=[
                    "Shows helpfulness while protecting core boundaries",
                ],
                risks=[
                    "Still adds some cognitive load",
                ],
                appropriate_when="The request is high-priority for the team and you have sufficient buffer.",
            ),
        ]
