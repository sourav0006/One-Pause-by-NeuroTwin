from app.ai.base import BaseAIProvider
from app.ai.demo import DevDemoAIProvider
from app.ai.gemini import GeminiProvider
from app.core.config import settings


def get_ai_provider() -> BaseAIProvider:
    """Dependency that returns the configured AI provider instance.

    Priority:
    1. If GEMINI_API_KEY is configured, return live GeminiProvider.
    2. If no key, but in development environment AND ENABLE_DEV_DEMO_AI is true,
       return DevDemoAIProvider (clearly labeled fixtures).
    3. Otherwise return GeminiProvider (which will raise AIProviderConfigError safely).
    """
    if (
        settings.AI_PROVIDER == "demo"
        and settings.ENVIRONMENT == "development"
        and settings.ENABLE_DEV_DEMO_AI
    ):
        return DevDemoAIProvider()

    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        return GeminiProvider()

    if settings.ENVIRONMENT == "development" and settings.ENABLE_DEV_DEMO_AI:
        return DevDemoAIProvider()

    return GeminiProvider()

