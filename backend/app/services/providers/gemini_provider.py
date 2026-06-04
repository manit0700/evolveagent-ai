from app.config import settings
from app.services.providers.base import LLMProvider


class GeminiProvider(LLMProvider):
    provider_name = "gemini"

    def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise RuntimeError("google-generativeai SDK is not installed") from exc

        genai.configure(api_key=settings.gemini_api_key)
        active_model = genai.GenerativeModel(model or settings.gemini_model, system_instruction=system_prompt)
        response = active_model.generate_content(user_prompt)
        return getattr(response, "text", "") or ""
