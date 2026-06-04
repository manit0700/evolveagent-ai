from collections import Counter
from datetime import UTC, datetime
from uuid import uuid4

from app.models.response_models import GovernanceEvent
from app.services.storage_service import StorageService


class GovernanceService:
    filename = "governance_log.json"

    def __init__(self, storage: StorageService):
        self.storage = storage

    def log_event(self, event: GovernanceEvent | dict) -> GovernanceEvent:
        if isinstance(event, dict):
            event = GovernanceEvent(**event)
        if not event.created_at:
            event = event.model_copy(update={"created_at": datetime.now(UTC).isoformat()})
        record = event.model_dump()
        record["event_id"] = str(uuid4())
        self.storage.append(self.filename, record)
        return GovernanceEvent(**{key: value for key, value in record.items() if key != "event_id"})

    def recent_events(self, limit: int = 50) -> list[dict]:
        return list(reversed(self.storage.read_list(self.filename)[-limit:]))

    def summary(self) -> dict:
        events = self.storage.read_list(self.filename)
        action_counts = Counter(item.get("action_type", "unknown") for item in events)
        risk_counts = Counter(self._risk_bucket(item.get("risk_score", 0)) for item in events)
        return {
            "total_events": len(events),
            "blocked_actions": sum(1 for item in events if item.get("blocked")),
            "approvals": sum(1 for item in events if item.get("approved") is True),
            "rejections": sum(1 for item in events if item.get("approved") is False and item.get("action_type") == "automation_rejected"),
            "secret_redactions": action_counts.get("secret_redaction", 0),
            "prompt_injection_warnings": action_counts.get("prompt_injection_warning", 0),
            "recent_events": self.recent_events(25),
            "risk_summary": dict(risk_counts),
        }

    @staticmethod
    def _risk_bucket(score: int) -> str:
        if score >= 70:
            return "high"
        if score >= 35:
            return "medium"
        return "low"
