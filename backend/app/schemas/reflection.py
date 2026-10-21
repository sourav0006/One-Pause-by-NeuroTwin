import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


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
    appropriate_when: str = Field(..., description="Circumstances under which this choice fits best")


class Connection(BaseModel):
    source: str = Field(..., description="Source node id")
    target: str = Field(..., description="Target node id")
    label: str | None = Field(None, description="Relationship description")


class StructuredReflectionState(BaseModel):
    encounter: Encounter
    reported_facts: list[ReportedFact] = Field(default_factory=list)
    hypotheses: list[Hypothesis] = Field(default_factory=list)
    unknowns: list[Unknown] = Field(default_factory=list)
    goals: list[Goal] = Field(default_factory=list)
    follow_up_question: FollowUpQuestion | None = None
    possible_responses: list[PossibleResponse] = Field(default_factory=list)
    connections: list[Connection] = Field(default_factory=list)


# Request and Response schemas
class AnalyzeRequest(BaseModel):
    situation: str = Field(..., min_length=10, max_length=4000, description="The situation in user's words")
    context: str | None = Field(None, max_length=1000, description="Optional personal or contextual detail")


class ClarifyRequest(BaseModel):
    answer: str = Field(..., min_length=1, max_length=2000, description="User's answer to the follow-up question")


class HypothesisUpdateRequest(BaseModel):
    status: Literal["active", "corrected", "dismissed"]
    corrected_text: str | None = Field(None, max_length=500)


class CompleteRequest(BaseModel):
    selected_option_id: str | None = None
    custom_response: str | None = Field(None, max_length=2000)


class SaveSessionRequest(BaseModel):
    title: str | None = Field(None, max_length=255)


class ReflectionResponse(BaseModel):
    id: uuid.UUID
    initial_situation: str
    status: str
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
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
