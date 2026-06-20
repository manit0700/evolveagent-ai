from app.config import settings
from app.services.image_service import ImageService
from app.services.llm_router import LLMRouter
from app.services.transcription_service import TranscriptionService


class RealApiControlService:
    def __init__(
        self,
        llm_router: LLMRouter,
        image_service: ImageService,
        transcription_service: TranscriptionService,
    ):
        self.llm_router = llm_router
        self.image_service = image_service
        self.transcription_service = transcription_service

    def summary(self) -> dict:
        text = self.llm_router.status().model_dump()
        image = self.image_service.status()
        transcription = self.transcription_service.status()
        paid_capabilities = [
            item["name"]
            for item in [
                {"name": "text", "ready": text["real_mode_ready"]},
                {"name": "image", "ready": image["real_image_ready"]},
                {"name": "transcription", "ready": transcription["real_transcription_ready"]},
            ]
            if item["ready"]
        ]
        return {
            "paid_api_ready": bool(paid_capabilities),
            "paid_capabilities": paid_capabilities,
            "dry_checks_default": True,
            "live_checks_require_confirmation": True,
            "capabilities": {
                "text": {
                    "mode": text["llm_mode"],
                    "provider": text["default_provider"],
                    "model": text["default_model"],
                    "ready": text["real_mode_ready"],
                    "fallback_provider": text["fallback_provider"],
                    "paid_call_warning": "Live text checks and real chat requests may call the configured LLM API.",
                    "estimate_note": "Token usage depends on prompt length, conversation context, attached files, and agent workflow depth.",
                },
                "image": {
                    "mode": image["image_mode"],
                    "provider": image["active_provider"],
                    "model": image["active_model"],
                    "size": image["image_size"],
                    "ready": image["real_image_ready"],
                    "fallback_provider": image["fallback_provider"],
                    "paid_call_warning": "Live image generation may call the image API and create billable image output.",
                    "estimate_note": f"One generated image at {image['image_size']} using {image['active_model']}.",
                },
                "transcription": {
                    "mode": transcription["transcription_mode"],
                    "provider": transcription["active_provider"],
                    "model": transcription["active_model"],
                    "ready": transcription["real_transcription_ready"],
                    "fallback_provider": transcription["fallback_provider"],
                    "paid_call_warning": "Recording upload may call transcription API based on audio duration and file size.",
                    "estimate_note": "Transcription cost depends on uploaded audio duration. Browser voice commands do not use paid transcription.",
                },
            },
        }

    @staticmethod
    def decode_error(error: str | None) -> dict:
        text = (error or "").strip()
        lowered = text.lower()
        if not text:
            return {
                "category": "none",
                "simple_message": "No provider error was reported.",
                "developer_message": "",
            }
        patterns = [
            ("missing_key", ("api key is not configured", "missing api key", "no api key"), "The API key is missing."),
            ("invalid_key", ("incorrect api key", "invalid api key", "authentication", "unauthorized"), "The API key appears to be invalid or unauthorized."),
            ("quota_or_billing", ("quota", "billing", "insufficient_quota", "payment"), "The provider reported a quota or billing problem."),
            ("rate_limited", ("rate limit", "429", "too many requests"), "The provider rate limit was reached."),
            ("timeout", ("timeout", "timed out", "connection"), "The provider request timed out or the network connection failed."),
            ("model_not_found", ("model", "does not exist", "not found", "unsupported"), "The configured model may be unavailable or unsupported."),
        ]
        for category, needles, message in patterns:
            if any(needle in lowered for needle in needles):
                return {
                    "category": category,
                    "simple_message": message,
                    "developer_message": text,
                }
        return {
            "category": "provider_error",
            "simple_message": "The provider returned an error and the app used fallback when available.",
            "developer_message": text,
        }

    def live_warning(self, capability: str) -> dict:
        summary = self.summary()
        item = summary["capabilities"].get(capability)
        if not item:
            return {
                "capability": capability,
                "requires_confirmation": True,
                "warning": "Unknown real API capability.",
                "ready": False,
            }
        return {
            "capability": capability,
            "requires_confirmation": True,
            "ready": item["ready"],
            "warning": item["paid_call_warning"],
            "estimate_note": item["estimate_note"],
            "provider": item["provider"],
            "model": item["model"],
        }
