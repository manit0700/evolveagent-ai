from app.config import settings
from app.models.response_models import ImageResult
from app.services.image_providers.mock_image_provider import MockImageProvider
from app.services.image_providers.openai_image_provider import OpenAIImageProvider


class ImageService:
    def __init__(self):
        self.mock_provider = MockImageProvider()
        self.openai_provider = OpenAIImageProvider()

    def generate(self, prompt: str, safety_rewritten: bool = False) -> ImageResult:
        if self._should_use_openai():
            try:
                return self.openai_provider.generate(prompt=prompt, safety_rewritten=safety_rewritten)
            except Exception as exc:
                fallback = self.mock_provider.generate(prompt=prompt, safety_rewritten=safety_rewritten)
                fallback.fallback_used = True
                fallback.fallback_error = str(exc)
                return fallback

        fallback = self.mock_provider.generate(prompt=prompt, safety_rewritten=safety_rewritten)
        fallback.fallback_used = settings.image_mode.lower() == "real"
        if fallback.fallback_used:
            if not settings.openai_api_key:
                fallback.fallback_error = "OPENAI_API_KEY is not configured"
            else:
                fallback.fallback_error = f"Image provider '{settings.image_provider}' is not enabled"
        return fallback

    @staticmethod
    def _should_use_openai() -> bool:
        return (
            settings.image_mode.lower() == "real"
            and settings.image_provider.lower() == "openai"
            and bool(settings.openai_api_key)
        )
