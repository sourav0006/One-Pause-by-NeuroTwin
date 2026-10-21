import asyncio
import json
import logging

from pydantic import ValidationError

from app.ai.base import (
    AIProviderConfigError,
    AIProviderException,
    AIProviderUnavailableError,
    AIProviderValidationError,
    BaseAIProvider,
)
from app.ai.prompts import (
    CLARIFY_UPDATE_SYSTEM_INSTRUCTION,
    GENERATE_OPTIONS_INSTRUCTION,
    INITIAL_ANALYSIS_SYSTEM_INSTRUCTION,
)
from app.core.config import settings
from app.schemas.reflection import (
    PossibleResponse,
    StructuredReflectionState,
)

logger = logging.getLogger("onepause.ai")


class GeminiProvider(BaseAIProvider):
    """Google Gemini AI implementation using official google-genai SDK."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model or settings.GEMINI_MODEL or "gemini-2.5-flash"
        self._client = None

    def _get_client(self):
        """Lazy-initialize google-genai Client."""
        if not self.api_key or not self.api_key.strip():
            raise AIProviderConfigError("GEMINI_API_KEY is not configured in backend environment.")
        if self._client is None:
            try:
                from google import genai

                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
                raise AIProviderConfigError(f"Could not initialize Gemini client: {e!s}")
        return self._client

    async def analyze_situation(
        self, situation: str, context: str | None = None
    ) -> StructuredReflectionState:
        """Analyze a new situation using Gemini with structured output validation."""
        client = self._get_client()
        from google.genai import errors, types

        prompt = f"User Situation:\n{situation.strip()}"
        if context and context.strip():
            prompt += f"\n\nOptional User Context:\n{context.strip()}"

        config = types.GenerateContentConfig(
            system_instruction=INITIAL_ANALYSIS_SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=StructuredReflectionState,
            temperature=0.2,
        )

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                ),
                timeout=30.0,
            )

            if not response.text:
                raise AIProviderValidationError("Gemini returned an empty response text.")

            state = StructuredReflectionState.model_validate_json(response.text)
            return state

        except errors.APIError as e:
            logger.error(f"Gemini API error during analysis: {e}")
            msg = str(e).lower()
            if "quota" in msg or "429" in msg or "rate limit" in msg:
                raise AIProviderUnavailableError(
                    "Gemini API rate limit or quota exceeded. Please try again shortly."
                )
            if (
                "api_key" in msg
                or "auth" in msg
                or "permission" in msg
                or "401" in msg
                or "403" in msg
            ):
                raise AIProviderConfigError(
                    "Gemini API authentication failed. Check configured API key."
                )
            raise AIProviderUnavailableError(
                "Reflection service is temporarily unavailable. Please try again."
            )
        except TimeoutError:
            logger.error("Gemini request timed out after 30 seconds")
            raise AIProviderUnavailableError("Reflection request timed out. Please try again.")
        except ValidationError as ve:
            logger.error(f"Pydantic validation failed for Gemini response: {ve}")
            raise AIProviderValidationError(
                "AI response did not match required reflection structure."
            )
        except AIProviderException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Gemini analysis: {e}")
            raise AIProviderUnavailableError(
                "An unexpected error occurred during reflection analysis."
            )

    async def clarify_reflection(
        self, current_state: StructuredReflectionState, user_answer: str
    ) -> StructuredReflectionState:
        """Update reflection state with user's answer to the follow-up question."""
        client = self._get_client()
        from google.genai import errors, types

        state_json = current_state.model_dump_json(indent=2)
        prompt = (
            f"Current Reflection State (JSON):\n{state_json}\n\n"
            f"Follow-up Question Asked: {current_state.follow_up_question.text if current_state.follow_up_question else 'N/A'}\n"
            f"User's Answer: {user_answer.strip()}\n\n"
            "Return the complete updated structured state reflecting this clarification."
        )

        config = types.GenerateContentConfig(
            system_instruction=CLARIFY_UPDATE_SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=StructuredReflectionState,
            temperature=0.2,
        )

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                ),
                timeout=30.0,
            )

            if not response.text:
                raise AIProviderValidationError("Gemini returned an empty response text.")

            updated_state = StructuredReflectionState.model_validate_json(response.text)
            return updated_state

        except errors.APIError as e:
            logger.error(f"Gemini API error during clarification: {e}")
            msg = str(e).lower()
            if "quota" in msg or "429" in msg or "rate limit" in msg:
                raise AIProviderUnavailableError(
                    "Gemini API rate limit or quota exceeded. Please try again shortly."
                )
            raise AIProviderUnavailableError(
                "Reflection service is temporarily unavailable. Please try again."
            )
        except TimeoutError:
            raise AIProviderUnavailableError("Clarification request timed out. Please try again.")
        except ValidationError as ve:
            logger.error(f"Validation failed for clarified state: {ve}")
            raise AIProviderValidationError(
                "Clarified AI response did not match required reflection structure."
            )
        except AIProviderException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during clarification: {e}")
            raise AIProviderUnavailableError("Failed to update reflection with clarification.")

    async def generate_options(
        self, current_state: StructuredReflectionState
    ) -> list[PossibleResponse]:
        """Generate refreshed options for the current reflection."""
        client = self._get_client()
        from google.genai import types

        state_summary = {
            "encounter": current_state.encounter.model_dump(),
            "reported_facts": [f.model_dump() for f in current_state.reported_facts],
            "hypotheses": [
                h.model_dump() for h in current_state.hypotheses if h.status != "dismissed"
            ],
            "unknowns": [u.model_dump() for u in current_state.unknowns],
            "goals": [g.model_dump() for g in current_state.goals],
        }

        prompt = (
            f"Current Reflection Summary:\n{json.dumps(state_summary, indent=2)}\n\n"
            f"{GENERATE_OPTIONS_INSTRUCTION}"
        )

        class OptionsPayload(
            types.BaseModel if hasattr(types, "BaseModel") else StructuredReflectionState
        ):
            pass

        # We can also call analyze or use a structured container schema:
        # Instead of separate ad-hoc schema, return options via StructuredReflectionState or list
        # For full safety, we can request full reflection state or options list
        config = types.GenerateContentConfig(
            system_instruction=INITIAL_ANALYSIS_SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=StructuredReflectionState,
            temperature=0.3,
        )

        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                ),
                timeout=30.0,
            )
            parsed = StructuredReflectionState.model_validate_json(response.text)
            return parsed.possible_responses
        except Exception as e:
            logger.error(f"Failed to generate options: {e}")
            raise AIProviderUnavailableError("Could not generate updated options at this time.")
