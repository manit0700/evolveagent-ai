from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.services.storage_service import StorageService


class ToolExecutionService:
    filename = "tool_execution_history.json"

    def __init__(self, storage: StorageService):
        self.storage = storage

    def record(self, trace: dict[str, Any], workspace_id: str | None = None, run_id: str | None = None) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        record = {
            "execution_id": trace.get("execution_id") or str(uuid4()),
            "run_id": run_id,
            "workspace_id": workspace_id,
            "tool_name": trace.get("tool_name", "unknown"),
            "source": trace.get("source", "built_in"),
            "permission_level": trace.get("permission_level", "read_only"),
            "selected": bool(trace.get("selected", True)),
            "executed": bool(trace.get("executed", False)),
            "blocked": bool(trace.get("blocked", False)),
            "approval_required": bool(trace.get("approval_required", False)),
            "sanitized_input": str(trace.get("sanitized_input", ""))[:500],
            "result_summary": str(trace.get("result_summary", ""))[:1000],
            "success": bool(trace.get("success", False)),
            "quality_score": int(trace.get("quality_score", 0)),
            "quality_notes": str(trace.get("quality_notes", ""))[:500],
            "created_at": trace.get("created_at") or now,
        }
        self.storage.append(self.filename, record)
        return record

    def list_history(self, workspace_id: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        limit = max(1, min(limit, 200))
        records = self.storage.read_list(self.filename)
        if workspace_id:
            records = [item for item in records if item.get("workspace_id") == workspace_id]
        return list(reversed(records[-limit:]))

    def get(self, execution_id: str) -> dict[str, Any] | None:
        return next(
            (item for item in self.storage.read_list(self.filename) if item.get("execution_id") == execution_id),
            None,
        )

    def summary(self, workspace_id: str | None = None) -> dict[str, Any]:
        records = self.storage.read_list(self.filename)
        if workspace_id:
            records = [item for item in records if item.get("workspace_id") == workspace_id]
        total = len(records)
        executed = sum(1 for item in records if item.get("executed"))
        blocked = sum(1 for item in records if item.get("blocked"))
        approval_required = sum(1 for item in records if item.get("approval_required"))
        tool_counts = Counter(item.get("tool_name", "unknown") for item in records)
        average_quality = round(
            sum(int(item.get("quality_score", 0)) for item in records) / total,
            1,
        ) if total else 0
        return {
            "total_executions": total,
            "executed": executed,
            "blocked": blocked,
            "approval_required": approval_required,
            "average_quality_score": average_quality,
            "most_used_tools": tool_counts.most_common(8),
            "recent_executions": self.list_history(workspace_id=workspace_id, limit=10),
        }
