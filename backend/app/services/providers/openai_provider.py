from app.config import settings
from app.services.providers.base import LLMProvider


class OpenAIProvider(LLMProvider):
    provider_name = "openai"

    def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=model or settings.openai_text_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content or ""
