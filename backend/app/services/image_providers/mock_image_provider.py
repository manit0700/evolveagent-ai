from html import escape
from pathlib import Path
from textwrap import shorten
from uuid import uuid4

from app.models.response_models import ImageResult


class MockImageProvider:
    provider = "mock_image"
    model = "mock-image-generator"

    def __init__(self, static_dir: Path | None = None):
        self.static_dir = static_dir or Path(__file__).resolve().parents[2] / "static"
        self.generated_dir = self.static_dir / "generated"
        self.generated_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, prompt: str, safety_rewritten: bool = False) -> ImageResult:
        image_id = f"{uuid4()}.svg"
        image_path = self.generated_dir / image_id
        prompt_preview = shorten(" ".join(prompt.split()), width=150, placeholder="...")
        image_path.write_text(self._svg(prompt_preview), encoding="utf-8")
        return ImageResult(
            image_url=f"/static/generated/{image_id}",
            prompt=prompt,
            provider=self.provider,
            model=self.model,
            fallback_used=False,
            safety_rewritten=safety_rewritten,
        )

    def _svg(self, prompt_preview: str) -> str:
        safe_prompt = escape(prompt_preview)
        return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="Mock generated image">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#171b22"/>
      <stop offset="52%" stop-color="#26313b"/>
      <stop offset="100%" stop-color="#11151b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="720" fill="url(#bg)"/>
  <rect x="52" y="52" width="1096" height="616" rx="32" fill="none" stroke="#9ad28d" stroke-opacity="0.38" stroke-width="2"/>
  <circle cx="975" cy="174" r="96" fill="#9ad28d" fill-opacity="0.14"/>
  <circle cx="222" cy="512" r="130" fill="#7898ff" fill-opacity="0.1"/>
  <text x="92" y="164" fill="#edf1f5" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="800">Mock Generated Image</text>
  <foreignObject x="92" y="244" width="1016" height="270">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Inter, Arial, sans-serif; color: #cfd8df; font-size: 32px; line-height: 1.35; font-weight: 650;">
      {safe_prompt}
    </div>
  </foreignObject>
  <text x="92" y="612" fill="#8f9aa5" font-family="Inter, Arial, sans-serif" font-size="24">Preview placeholder for the MVP image workflow</text>
</svg>
"""
