import base64
from pathlib import Path
from uuid import uuid4

import httpx

from app.config import settings
from app.models.response_models import ImageResult


class OpenAIImageProvider:
    provider = "openai"

    def __init__(self, static_dir: Path | None = None):
        self.static_dir = static_dir or Path(__file__).resolve().parents[2] / "static"
        self.generated_dir = self.static_dir / "generated"
        self.generated_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, prompt: str, safety_rewritten: bool = False) -> ImageResult:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai SDK is not installed") from exc

        client = OpenAI(api_key=settings.openai_api_key)
        model = settings.openai_image_model
        result = client.images.generate(
            model=model,
            prompt=prompt,
            n=1,
            size=settings.openai_image_size,
        )
        image_bytes = self._extract_image_bytes(result)
        image_id = f"{uuid4()}.png"
        image_path = self.generated_dir / image_id
        image_path.write_bytes(image_bytes)

        return ImageResult(
            image_url=f"/static/generated/{image_id}",
            prompt=prompt,
            provider=self.provider,
            model=model,
            fallback_used=False,
            safety_rewritten=safety_rewritten,
        )

    @staticmethod
    def _extract_image_bytes(result) -> bytes:
        image = result.data[0]
        b64_json = getattr(image, "b64_json", None) or (image.get("b64_json") if isinstance(image, dict) else None)
        if b64_json:
            return base64.b64decode(b64_json)

        url = getattr(image, "url", None) or (image.get("url") if isinstance(image, dict) else None)
        if url:
            response = httpx.get(url, timeout=30)
            response.raise_for_status()
            return response.content

        raise RuntimeError("OpenAI image response did not include image data")
