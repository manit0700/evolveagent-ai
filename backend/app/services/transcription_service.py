from pathlib import Path
from time import perf_counter

from app.config import settings


class TranscriptionService:
    def transcribe(self, path: Path, filename: str) -> dict:
        if settings.transcription_mode.lower() != "openai" or not settings.openai_api_key:
            return self.mock_transcript(filename)

        start = perf_counter()
        try:
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)
            with path.open("rb") as audio_file:
                result = client.audio.transcriptions.create(
                    model=settings.openai_transcription_model,
                    file=audio_file,
                )
            text = getattr(result, "text", "") or str(result)
            return {
                "provider": "openai",
                "model": settings.openai_transcription_model,
                "transcript": text,
                "latency_ms": int((perf_counter() - start) * 1000),
                "fallback_used": False,
                "error": None,
            }
        except Exception as exc:
            fallback = self.mock_transcript(filename)
            fallback["fallback_used"] = True
            fallback["error"] = f"OpenAI transcription failed: {exc}"
            return fallback

    @staticmethod
    def mock_transcript(filename: str) -> dict:
        transcript = (
            f"Mock transcript for {filename}. The speaker discusses project goals, current progress, "
            "important decisions, action items, and follow-up tasks. Decision: keep the MVP scope focused. "
            "Action item: summarize the key points, identify next steps, and prepare clean notes for review. "
            "Follow-up task: verify the implementation and update documentation."
        )
        return {
            "provider": "mock",
            "model": "mock-transcription",
            "transcript": transcript,
            "latency_ms": 0,
            "fallback_used": False,
            "error": None,
        }
