from app.config import settings
from app.services.providers.base import LLMProvider


class MistralProvider(LLMProvider):
    provider_name = "mistral"

    def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        if not settings.mistral_api_key:
            raise RuntimeError("MISTRAL_API_KEY is not configured")

        try:
            from mistralai import Mistral
        except ImportError as exc:
            raise RuntimeError("mistralai SDK is not installed") from exc

        client = Mistral(api_key=settings.mistral_api_key)
        response = client.chat.complete(
            model=model or settings.mistral_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content or ""
