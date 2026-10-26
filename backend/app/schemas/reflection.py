import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Encounter(BaseModel):
    description: str = Field(..., description="Concise objective overview of the situation")


class ReportedFact(BaseModel):
    id: str = Field(..., description="Stable node ID, e.g. fact_1")
    text: str = Field(..., description="Fact explicitly reported by the user")
    source: Literal["user"] = "user"


class Hypothesis(BaseModel):
    id: str = Field(..., description="Stable node ID, e.g. hypothesis_1")
    text: str = Field(..., description="Tentative interpretation or possible influence")
    source: Literal["ai"] = "ai"
    status: Literal["active", "corrected", "dismissed"] = "active"
    confidence: Literal["tentative", "moderate", "high"] = "tentative"
    user_note: str | None = Field(None, description="User correction note if updated")


class Unknown(BaseModel):
    id: str = Field(..., description="Stable node ID, e.g. unknown_1")
    text: str = Field(..., description="Relevant unanswered question or missing piece of context")


class Goal(BaseModel):
    id: str = Field(..., description="Stable node ID, e.g. goal_1")
    text: str = Field(..., description="Goal explicitly stated or confirmed by user")
    source: Literal["user", "inferred"] = "user"


class FollowUpQuestion(BaseModel):
    text: str = Field(..., description="One targeted, non-leading question to resolve uncertainty")
    purpose: str = Field(..., description="Why this question is relevant to the reflection")


class PossibleResponse(BaseModel):
    id: str = Field(..., description="Option ID, e.g. option_1")
    action: str = Field(..., description="Distinct, balanced action step")
    benefits: list[str] = Field(default_factory=list, description="Potential advantages")
    risks: list[str] = Field(default_factory=list, description="Potential trade-offs or costs")
    appropriate_when: str = Field(
        ..., description="Circumstances under which this choice fits best"
    )


class OptionsResponse(BaseModel):
    possible_responses: list[PossibleResponse] = Field(
        ..., min_length=3, max_length=3, description="List of exactly 3 generated possible next responses"
    )

    model_config = ConfigDict(validate_assignment=True)


class Connection(BaseModel):
    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")
    label: str | None = Field(None, description="Relationship description")


class BehaviouralAnswer(BaseModel):
    question_id: str = Field(..., description="Stable question identifier, e.g. q1")
    theme: str = Field(..., description="Theme, e.g. Immediate Focus, Influencing Factors, Prior Habits")
    question: str = Field(..., description="The neutral question asked")
    answer: str = Field(..., min_length=1, max_length=2000, description="User's response")


class BehaviouralQuestion(BaseModel):
    id: str = Field(..., description="Stable question identifier, e.g. q1")
    theme: str = Field(..., description="Short thematic category, e.g. Immediate Focus, Influencing Factors, Prior Habits")
    question: str = Field(..., description="Neutral, concise, non-leading question")
    options: list[str] = Field(default_factory=list, description="Neutral quick-select options")
    placeholder: str = Field(default="Your reflection...", description="Placeholder text")


class QuestionsRequest(BaseModel):
    situation: str = Field(..., min_length=10, max_length=4000)
    context: str | None = Field(None, max_length=1000)

    model_config = ConfigDict(extra="forbid")


class QuestionsResponse(BaseModel):
    questions: list[BehaviouralQuestion] = Field(..., min_length=3, max_length=3)


class StructuredReflectionState(BaseModel):
    encounter: Encounter
    reported_facts: list[ReportedFact] = Field(default_factory=list)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    unknowns: list[Unknown] = Field(default_factory=list)
    goals: list[Goal] = Field(default_factory=list)
    follow_up_question: FollowUpQuestion | None = None
    possible_responses: list[PossibleResponse] = Field(
        ..., min_length=3, max_length=3, description="Exactly 3 balanced response options"
    )
    connections: list[Connection] = Field(default_factory=list)
    behavioural_answers: list[BehaviouralAnswer] = Field(default_factory=list)

    model_config = ConfigDict(validate_assignment=True)


# Request and Response schemas
class AnalyzeRequest(BaseModel):
    situation: str = Field(
        ..., min_length=10, max_length=4000, description="The situation in user's words"
    )
    context: str | None = Field(
        None, max_length=1000, description="Optional personal or contextual detail"
    )
    behavioural_answers: list[BehaviouralAnswer] = Field(
        default_factory=list, description="Three answered behavioural questions"
    )

    model_config = ConfigDict(extra="forbid")


class ClarifyRequest(BaseModel):
    answer: str = Field(
        ..., min_length=1, max_length=2000, description="User's answer to the follow-up question"
    )

    model_config = ConfigDict(extra="forbid")


class HypothesisUpdateRequest(BaseModel):
    status: Literal["active", "corrected", "dismissed"]
    corrected_text: str | None = Field(None, max_length=500)

    model_config = ConfigDict(extra="forbid")


class CompleteRequest(BaseModel):
    selected_option_id: str | None = None
    custom_response: str | None = Field(None, max_length=2000)

    model_config = ConfigDict(extra="forbid")


class SaveSessionRequest(BaseModel):
    title: str | None = Field(None, max_length=255)

    model_config = ConfigDict(extra="forbid")


class ReflectionResponse(BaseModel):
    id: uuid.UUID
    initial_situation: str
    status: str
    is_saved: bool = False
    selected_response_id: str | None = None
    title: str | None = None
    state: StructuredReflectionState
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class SessionSummaryResponse(BaseModel):
    id: uuid.UUID
    title: str | None = None
    initial_situation: str
    status: str
    is_saved: bool = False
    selected_response_id: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
