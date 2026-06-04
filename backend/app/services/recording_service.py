import os
import re
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config import DATA_DIR
from app.services.storage_service import StorageService
from app.services.transcription_service import TranscriptionService


RECORDINGS_DIR = Path(DATA_DIR).parent / "uploads" / "recordings"
MAX_RECORDING_SIZE_BYTES = 50 * 1024 * 1024
MAX_RECORDINGS_PER_UPLOAD = 5
SUPPORTED_RECORDING_EXTENSIONS = {".mp3", ".m4a", ".wav", ".mp4", ".webm"}


class RecordingService:
    def __init__(self, storage: StorageService):
        self.storage = storage
        self.transcription = TranscriptionService()
        RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

    async def process_uploads(self, files: list[UploadFile], session_id: str | None = None) -> list[dict]:
        if len(files) > MAX_RECORDINGS_PER_UPLOAD:
            return [
                {
                    "recording_id": str(uuid4()),
                    "session_id": session_id,
                    "filename": "recording batch",
                    "content_type": None,
                    "extension": "",
                    "size_bytes": 0,
                    "status": "failed",
                    "transcript_preview": "",
                    "transcript_length": 0,
                    "error": f"Upload limit is {MAX_RECORDINGS_PER_UPLOAD} recordings per request.",
                }
            ]
        return [await self.process_recording(file, session_id=session_id) for file in files]

    async def process_recording(self, file: UploadFile, session_id: str | None = None) -> dict:
        recording_id = str(uuid4())
        original_filename = file.filename or "uploaded-recording"
        safe_filename = self.safe_filename(original_filename)
        extension = Path(safe_filename).suffix.lower()
        content = await file.read()
        size_bytes = len(content)
        now = datetime.now(UTC).isoformat()
        stored_path = RECORDINGS_DIR / f"{recording_id}_{safe_filename}"

        metadata = {
            "recording_id": recording_id,
            "session_id": session_id,
            "filename": original_filename,
            "safe_filename": safe_filename,
            "stored_path": str(stored_path),
            "content_type": file.content_type,
            "extension": extension,
            "size_bytes": size_bytes,
            "status": "failed",
            "transcript": "",
            "transcript_preview": "",
            "transcript_length": 0,
            "provider": "mock",
            "model": "mock-transcription",
            "latency_ms": 0,
            "fallback_used": False,
            "created_at": now,
            "error": None,
        }

        if extension not in SUPPORTED_RECORDING_EXTENSIONS:
            metadata["error"] = f"Unsupported recording type '{extension or 'unknown'}'."
            self.storage.append("recordings.json", metadata)
            return self.response_metadata(metadata)

        if size_bytes > MAX_RECORDING_SIZE_BYTES:
            metadata["error"] = "Recording exceeds the 50 MB limit."
            self.storage.append("recordings.json", metadata)
            return self.response_metadata(metadata)

        try:
            stored_path.write_bytes(content)
            transcription = self.transcription.transcribe(stored_path, original_filename)
            transcript = transcription["transcript"]
            metadata.update(
                {
                    "status": "processed",
                    "transcript": transcript,
                    "transcript_preview": self.preview(transcript),
                    "transcript_length": len(transcript),
                    "provider": transcription["provider"],
                    "model": transcription["model"],
                    "latency_ms": transcription["latency_ms"],
                    "fallback_used": transcription["fallback_used"],
                    "error": transcription["error"],
                }
            )
        except Exception as exc:
            metadata["error"] = f"Could not process recording: {exc}"

        self.storage.append("recordings.json", metadata)
        return self.response_metadata(metadata)

    @staticmethod
    def response_metadata(metadata: dict) -> dict:
        return {
            "recording_id": metadata["recording_id"],
            "session_id": metadata.get("session_id"),
            "filename": metadata["filename"],
            "content_type": metadata.get("content_type"),
            "extension": metadata["extension"],
            "size_bytes": metadata["size_bytes"],
            "status": metadata["status"],
            "transcript_preview": metadata.get("transcript_preview", ""),
            "transcript_length": metadata.get("transcript_length", 0),
            "provider": metadata.get("provider", "mock"),
            "model": metadata.get("model", "mock-transcription"),
            "fallback_used": metadata.get("fallback_used", False),
            "error": metadata.get("error"),
        }

    @staticmethod
    def safe_filename(filename: str) -> str:
        name = os.path.basename(filename).strip() or "uploaded-recording"
        name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
        return name[:120] or "uploaded-recording"

    @staticmethod
    def preview(text: str, limit: int = 360) -> str:
        compact = " ".join(text.split())
        return compact[:limit] + ("..." if len(compact) > limit else "")

    def get_recording(self, recording_id: str) -> dict | None:
        return next((item for item in self.storage.read_list("recordings.json") if item.get("recording_id") == recording_id), None)

    def build_context(self, recording_ids: list[str], limit: int = 20_000) -> tuple[str, list[dict]]:
        context_parts = []
        recordings_used = []
        remaining = limit
        for recording_id in recording_ids:
            metadata = self.get_recording(recording_id)
            if not metadata or metadata.get("status") != "processed":
                continue
            transcript = metadata.get("transcript", "")
            clipped = transcript[:remaining]
            if not clipped:
                break
            context_parts.append(
                f"Recording: {metadata.get('filename')} ({metadata.get('extension')})\nTranscript:\n{clipped}"
            )
            remaining -= len(clipped)
            recordings_used.append(
                {
                    "recording_id": metadata["recording_id"],
                    "filename": metadata["filename"],
                    "content_type": metadata.get("content_type"),
                    "extension": metadata["extension"],
                    "size_bytes": metadata["size_bytes"],
                    "transcript_length": metadata.get("transcript_length", 0),
                    "provider": metadata.get("provider", "mock"),
                    "model": metadata.get("model", "mock-transcription"),
                    "fallback_used": metadata.get("fallback_used", False),
                }
            )
            if remaining <= 0:
                break
        return "\n\n---\n\n".join(context_parts), recordings_used
