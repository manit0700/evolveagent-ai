from __future__ import annotations

import re
from datetime import UTC, datetime

from app.services.storage_service import StorageService


class UserPreferenceService:
    def __init__(self, storage: StorageService):
        self.storage = storage

    def update_from_feedback(self, feedback: dict) -> list[dict]:
        if feedback.get("rating") == "not_helpful":
            return self.storage.read_list("user_preferences.json")

        run_id = feedback.get("run_id")
        message = self._assistant_message_for_run(run_id)
        result = message.get("result", {}) if message else {}
        content = (message or {}).get("content", "") or result.get("final_output", "")
        comment = (feedback.get("comment") or "").lower()
        task_type = result.get("task_type", "unknown")
        workspace_id = feedback.get("workspace_id") or result.get("workspace_id")
        inferred = self.infer_preferences(content, comment, task_type)
        if not inferred:
            return self.storage.read_list("user_preferences.json")

        preferences = self.storage.read_list("user_preferences.json")
        now = datetime.now(UTC).isoformat()
        for name, evidence in inferred:
            record = next(
                (
                    item
                    for item in preferences
                    if item.get("preference") == name and item.get("workspace_id") == workspace_id
                ),
                None,
            )
            if record is None:
                record = {
                    "preference": name,
                    "workspace_id": workspace_id,
                    "score": 0,
                    "evidence": [],
                    "last_updated": now,
                }
                preferences.append(record)
            record["score"] = record.get("score", 0) + 1
            record.setdefault("evidence", []).append(evidence)
            record["evidence"] = record["evidence"][-5:]
            record["last_updated"] = now
        self.storage.write_list("user_preferences.json", preferences)
        return preferences

    def _assistant_message_for_run(self, run_id: str | None) -> dict:
        if not run_id:
            return {}
        for message in reversed(self.storage.read_list("messages.json")):
            if message.get("role") == "assistant" and message.get("run_id") == run_id:
                return message
        return {}

    @staticmethod
    def infer_preferences(content: str, comment: str, task_type: str) -> list[tuple[str, str]]:
        preferences: list[tuple[str, str]] = []
        text = content or ""
        lowered = text.lower()

        if "concise" in comment or "short" in comment or len(text) < 700:
            preferences.append(("concise", "Helpful feedback on a short or explicitly concise answer."))
        if "detailed" in comment or len(text) > 1400:
            preferences.append(("detailed", "Helpful feedback on a detailed answer."))
        if task_type in {"coding", "code_review", "app_automation", "system_explanation"} or "technical" in comment:
            preferences.append(("technical", f"Positive feedback on a {task_type} response."))
        if "simple" in comment or "easy" in comment:
            preferences.append(("simple", "Feedback comment preferred simple wording."))
        if re.search(r"(^|\n)\s*(-|\*|\d+\.)\s+", text):
            preferences.append(("prefers_bullets", "Positive feedback on an answer with bullets or numbered steps."))
        if "```" in text or task_type in {"coding", "code_review", "app_automation"}:
            preferences.append(("prefers_code_examples", "Positive feedback on a code-oriented response."))
        if "step" in lowered or re.search(r"(^|\n)\s*\d+\.\s+", text):
            preferences.append(("prefers_step_by_step", "Positive feedback on a step-by-step response."))

        unique: dict[str, str] = {}
        for name, evidence in preferences:
            unique.setdefault(name, evidence)
        return list(unique.items())
