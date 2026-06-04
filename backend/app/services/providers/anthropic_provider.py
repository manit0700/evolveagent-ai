from app.config import settings
from app.services.providers.base import LLMProvider


class AnthropicProvider(LLMProvider):
    provider_name = "anthropic"

    def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")

        try:
            import anthropic
        except ImportError as exc:
            raise RuntimeError("anthropic SDK is not installed") from exc

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model=model or settings.anthropic_model,
            max_tokens=1200,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
