from app.ai.base import BaseAIProvider
from app.ai.gemini import GeminiProvider


def get_ai_provider() -> BaseAIProvider:
    """Dependency that returns the configured AI provider instance."""
    return GeminiProvider()
