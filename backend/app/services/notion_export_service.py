from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import httpx

from app.config import settings
from app.models.response_models import GovernanceEvent, RunResponse
from app.services.governance_service import GovernanceService
from app.services.secret_scanner import SecretScanner
from app.services.storage_service import StorageService

NOTION_PAGES_URL = "https://api.notion.com/v1/pages"


class NotionExportService:
    filename = "notion_exports.json"

    def __init__(
        self,
        storage: StorageService,
        governance: GovernanceService,
        secret_scanner: SecretScanner | None = None,
    ):
        self.storage = storage
        self.governance = governance
        self.secret_scanner = secret_scanner or SecretScanner()

    def status(self) -> dict[str, Any]:
        return {
            "enabled": settings.notion_sync_enabled,
            "configured": bool(settings.notion_api_key and settings.notion_parent_page_id),
            "parent_page_set": bool(settings.notion_parent_page_id),
            "notion_version": settings.notion_version,
            "recent_exports": self.list_exports(limit=10),
        }

    def list_exports(self, limit: int = 50) -> list[dict[str, Any]]:
        return list(reversed(self.storage.read_list(self.filename)[-limit:]))

    def export_run_completed(self, response: RunResponse) -> dict[str, Any]:
        title = f"EvolveAgent AI: {response.task_type} ({response.run_id[:8]})"
        summary = self._summarize_run(response)
        content = (
            f"Task type: {response.task_type}\n"
            f"Judge score: {response.judge_result.overall_score}\n"
            f"Run ID: {response.run_id}\n"
            f"Session ID: {response.session_id}\n\n"
            f"{summary}"
        )
        return self.export_page(
            title=title,
            content=content,
            event_type="run_completed",
            run_id=response.run_id,
            session_id=response.session_id,
            workspace_id=response.workspace_id,
            task_type=response.task_type,
        )

    def export_page(
        self,
        *,
        title: str,
        content: str,
        event_type: str = "manual_export",
        run_id: str | None = None,
        session_id: str | None = None,
        workspace_id: str | None = None,
        task_type: str | None = None,
    ) -> dict[str, Any]:
        safe_title, title_scan = self.secret_scanner.redact(title)
        safe_content, content_scan = self.secret_scanner.redact(content)
        redaction_count = title_scan.redaction_count + content_scan.redaction_count

        base_record = {
            "export_id": str(uuid4()),
            "event_type": event_type,
            "run_id": run_id,
            "session_id": session_id,
            "workspace_id": workspace_id,
            "task_type": task_type,
            "title": safe_title[:200],
            "enabled": settings.notion_sync_enabled,
            "configured": bool(settings.notion_api_key and settings.notion_parent_page_id),
            "redaction_count": redaction_count,
            "created_at": datetime.now(UTC).isoformat(),
        }

        if not settings.notion_sync_enabled:
            return {**base_record, "exported": False, "skipped": True, "reason": "Notion sync is disabled."}

        if not settings.notion_api_key or not settings.notion_parent_page_id:
            record = {**base_record, "exported": False, "skipped": True, "reason": "Notion API key or parent page ID is not configured."}
            self._persist(record)
            self._log_governance(record)
            return record

        payload = self._page_payload(safe_title, safe_content)
        headers = {
            "Authorization": f"Bearer {settings.notion_api_key}",
            "Content-Type": "application/json",
            "Notion-Version": settings.notion_version,
        }
        try:
            response = httpx.post(NOTION_PAGES_URL, headers=headers, json=payload, timeout=20.0)
            response.raise_for_status()
            body = response.json()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:1000] if exc.response is not None else str(exc)
            record = {**base_record, "exported": False, "skipped": False, "error": detail}
            self._persist(record)
            self._log_governance(record, blocked=True)
            return record
        except httpx.HTTPError as exc:
            record = {**base_record, "exported": False, "skipped": False, "error": str(exc)}
            self._persist(record)
            self._log_governance(record, blocked=True)
            return record

        record = {
            **base_record,
            "exported": True,
            "skipped": False,
            "status_code": response.status_code,
            "notion_page_id": body.get("id"),
            "notion_url": body.get("url"),
        }
        self._persist(record)
        self._log_governance(record)
        return record

    def _page_payload(self, title: str, content: str) -> dict[str, Any]:
        paragraphs = self._paragraph_chunks(content)
        return {
            "parent": {"page_id": settings.notion_parent_page_id},
            "properties": {"title": [{"text": {"content": title[:200] or "EvolveAgent AI Export"}}]},
            "children": [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {"rich_text": [{"type": "text", "text": {"content": chunk}}]},
                }
                for chunk in paragraphs
            ],
        }

    @staticmethod
    def _paragraph_chunks(content: str) -> list[str]:
        text = content.strip() or "No summary content was provided."
        chunks: list[str] = []
        current = ""
        for line in text.splitlines():
            candidate = f"{current}\n{line}".strip() if current else line.strip()
            if len(candidate) > 1800:
                if current:
                    chunks.append(current[:1800])
                current = line.strip()
            else:
                current = candidate
        if current:
            chunks.append(current[:1800])
        return chunks[:80] or ["No summary content was provided."]

    def _persist(self, record: dict[str, Any]) -> None:
        self.storage.append(self.filename, record)

    def _log_governance(self, record: dict[str, Any], blocked: bool = False) -> None:
        self.governance.log_event(
            GovernanceEvent(
                run_id=record.get("run_id"),
                session_id=record.get("session_id"),
                workspace_id=record.get("workspace_id"),
                task_type=record.get("task_type"),
                agent_name="Notion Export Service",
                action_type="notion_export",
                tool_used="NotionExportService",
                permission_level="read_only",
                approved=False,
                blocked=blocked,
                risk_score=35 if blocked else 10,
                reason=record.get("error") or record.get("reason") or "Notion export processed.",
            )
        )

    @staticmethod
    def _summarize_run(response: RunResponse) -> str:
        clean = " ".join(response.final_output.split())
        if len(clean) > 4000:
            clean = f"{clean[:3997]}..."
        return clean or "Run completed without a text summary."
