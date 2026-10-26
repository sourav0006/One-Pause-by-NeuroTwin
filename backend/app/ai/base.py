from abc import ABC, abstractmethod

from app.schemas.reflection import (
    BehaviouralAnswer,
    BehaviouralQuestion,
    PossibleResponse,
    StructuredReflectionState,
)


class AIProviderException(Exception):
    """Base exception for all AI provider operations."""

    def __init__(self, message: str, code: str = "AI_PROVIDER_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class AIProviderConfigError(AIProviderException):
    """Raised when the AI provider credentials or model settings are missing or misconfigured."""

    def __init__(
        self,
        message: str = "AI provider is not configured. Please configure GEMINI_API_KEY.",
    ):
        super().__init__(message=message, code="AI_PROVIDER_NOT_CONFIGURED")


class AIProviderUnavailableError(AIProviderException):
    """Raised when the cloud AI provider encounters rate limits, timeouts, or service disruptions."""

    def __init__(
        self,
        message: str = "Reflection is temporarily unavailable. Please try again.",
    ):
        super().__init__(message=message, code="AI_PROVIDER_UNAVAILABLE")


class AIProviderValidationError(AIProviderException):
    """Raised when the AI output does not conform to the required structured schema."""

    def __init__(
        self,
        message: str = "Failed to generate a valid structured reflection state.",
    ):
        super().__init__(message=message, code="AI_OUTPUT_VALIDATION_ERROR")


class BaseAIProvider(ABC):
    """Abstract base class for provider-independent AI reflection operations."""

    @abstractmethod
    async def generate_behavioural_questions(
        self, situation: str, context: str | None = None
    ) -> list[BehaviouralQuestion]:
        """Generate three neutral, concise behavioural questions tailored to the situation."""

    @abstractmethod
    async def analyze_situation(
        self,
        situation: str,
        context: str | None = None,
        behavioural_answers: list[BehaviouralAnswer] | None = None,
    ) -> StructuredReflectionState:
        """Analyze a new situation and produce initial structured reflection data."""

    @abstractmethod
    async def clarify_reflection(
        self, current_state: StructuredReflectionState, user_answer: str
    ) -> StructuredReflectionState:
        """Incorporate the user's answer into the reflection state, updating hypotheses and unknowns."""

    @abstractmethod
    async def generate_options(
        self, current_state: StructuredReflectionState
    ) -> list[PossibleResponse]:
        """Generate balanced, context-sensitive next-step possibilities."""
