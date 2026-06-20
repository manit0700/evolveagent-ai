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

    def status(self) -> dict:
        real_ready = self._should_use_openai()
        configured = bool(settings.openai_api_key)
        if settings.image_mode.lower() == "mock":
            message = "Mock image mode is active. Real image APIs are not called."
        elif real_ready:
            message = f"Real image mode is ready with OpenAI model {settings.openai_image_model}."
        elif settings.image_provider.lower() != "openai":
            message = f"Image provider '{settings.image_provider}' is not enabled. Mock fallback will be used."
        else:
            message = "IMAGE_MODE=real, but OPENAI_API_KEY is not configured. Mock fallback will be used."
        return {
            "image_mode": settings.image_mode,
            "image_provider": settings.image_provider,
            "openai_configured": configured,
            "real_image_ready": real_ready,
            "active_provider": "openai" if real_ready else "mock_image",
            "active_model": settings.openai_image_model if real_ready else "mock-image-generator",
            "image_size": settings.openai_image_size,
            "fallback_provider": "mock_image",
            "status_message": message,
        }

    def smoke_test(self, live: bool = False, prompt: str = "A futuristic AI assistant in a holographic interface") -> dict:
        status = self.status()
        if not live:
            return {
                "success": bool(status["real_image_ready"] or status["active_provider"] == "mock_image"),
                "live": False,
                "provider": status["active_provider"],
                "model": status["active_model"],
                "message": status["status_message"],
                "fallback_provider": status["fallback_provider"],
            }
        result = self.generate(prompt)
        return {
            "success": True,
            "live": True,
            "provider": result.provider,
            "model": result.model,
            "image_url": result.image_url,
            "fallback_used": result.fallback_used,
            "fallback_error": result.fallback_error,
            "message": "Image live check completed.",
        }

    @staticmethod
    def _should_use_openai() -> bool:
        return (
            settings.image_mode.lower() == "real"
            and settings.image_provider.lower() == "openai"
            and bool(settings.openai_api_key)
        )
