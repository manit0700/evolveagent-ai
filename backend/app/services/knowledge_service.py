from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import UTC, datetime
from typing import Any

from app.services.storage_service import StorageService
from app.services.workspace_service import WorkspaceService


class KnowledgeService:
    """Workspace-scoped full-text knowledge layer over existing JSON records."""

    def __init__(self, storage: StorageService, workspace_service: WorkspaceService):
        self.storage = storage
        self.workspace_service = workspace_service

    def search(
        self,
        workspace_id: str | None,
        query: str = "",
        source_type: str | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        resolved = self.workspace_service.resolve_workspace_id(workspace_id)
        records = self._records(resolved)
        if source_type:
            records = [item for item in records if item["source_type"] == source_type]

        terms = self._terms(query)
        scored = []
        for record in records:
            score = self._score(record, terms)
            if terms and score <= 0:
                continue
            scored.append({**record, "score": score})

        scored.sort(
            key=lambda item: (
                item.get("score", 0),
                item.get("importance_rank", 0),
                item.get("updated_at") or item.get("created_at") or "",
            ),
            reverse=True,
        )
        selected = scored[: max(1, min(limit, 100))]
        return {
            "workspace_id": resolved,
            "query": query,
            "source_type": source_type,
            "total_records": len(records),
            "result_count": len(selected),
            "results": selected,
            "related_links": self.related_links(resolved, selected[:8]),
        }

    def summary(self, workspace_id: str | None) -> dict[str, Any]:
        resolved = self.workspace_service.resolve_workspace_id(workspace_id)
        records = self._records(resolved)
        source_counts = Counter(item["source_type"] for item in records)
        tag_counts = Counter(tag for item in records for tag in item.get("tags", []))
        high_importance = [item for item in records if item.get("importance") == "high"]
        recent = sorted(records, key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)[:10]
        return {
            "workspace_id": resolved,
            "total_records": len(records),
            "source_counts": [{"source_type": name, "count": count} for name, count in source_counts.most_common()],
            "top_tags": [{"tag": name, "count": count} for name, count in tag_counts.most_common(12)],
            "high_importance_count": len(high_importance),
            "recent_records": recent,
            "generated_at": datetime.now(UTC).isoformat(),
        }

    def related_links(self, workspace_id: str | None, seeds: list[dict[str, Any]]) -> list[dict[str, Any]]:
        resolved = self.workspace_service.resolve_workspace_id(workspace_id)
        if not seeds:
            return []
        records = self._records(resolved)
        seed_terms = set()
        for seed in seeds:
            seed_terms.update(self._terms(f"{seed.get('title', '')} {seed.get('content_preview', '')} {' '.join(seed.get('tags', []))}"))
        links = []
        for record in records:
            if any(record["record_id"] == seed.get("record_id") for seed in seeds):
                continue
            score = self._score(record, seed_terms)
            if score >= 2:
                links.append(
                    {
                        "record_id": record["record_id"],
                        "source_type": record["source_type"],
                        "title": record["title"],
                        "score": score,
                        "reason": "Shares terms/tags with current knowledge results.",
                    }
                )
        links.sort(key=lambda item: item["score"], reverse=True)
        return links[:10]

    def export_markdown(self, workspace_id: str | None) -> str:
        resolved = self.workspace_service.resolve_workspace_id(workspace_id)
        workspace = self.workspace_service.get_workspace(resolved) or {}
        records = sorted(
            self._records(resolved),
            key=lambda item: (item["source_type"], item.get("updated_at") or item.get("created_at") or ""),
            reverse=True,
        )
        lines = [
            f"# {workspace.get('name', 'Workspace')} Knowledge Base",
            "",
            f"Exported: {datetime.now(UTC).isoformat()}",
            "",
        ]
        for source_type, grouped in self._group_by_source(records).items():
            lines.extend([f"## {source_type.replace('_', ' ').title()}", ""])
            for item in grouped:
                tags = f" Tags: {', '.join(item.get('tags', []))}" if item.get("tags") else ""
                lines.extend(
                    [
                        f"### {item['title']}",
                        f"- Importance: {item.get('importance', 'medium')}{tags}",
                        f"- Updated: {item.get('updated_at') or item.get('created_at') or 'unknown'}",
                        "",
                        item.get("content_preview", ""),
                        "",
                    ]
                )
        return "\n".join(lines).strip() + "\n"

    def export_json(self, workspace_id: str | None) -> dict[str, Any]:
        resolved = self.workspace_service.resolve_workspace_id(workspace_id)
        return {
            "workspace_id": resolved,
            "summary": self.summary(resolved),
            "records": self._records(resolved),
            "exported_at": datetime.now(UTC).isoformat(),
        }

    def _records(self, workspace_id: str) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        records.extend(self._memory_records(workspace_id))
        records.extend(self._message_records(workspace_id))
        records.extend(self._file_records(workspace_id))
        records.extend(self._recording_records(workspace_id))
        records.extend(self._goal_records(workspace_id))
        records.extend(self._custom_agent_records(workspace_id))
        return records

    def _memory_records(self, workspace_id: str) -> list[dict[str, Any]]:
        items = [item for item in self.storage.read_list("workspace_memory.json") if item.get("workspace_id") == workspace_id]
        return [
            self._record(
                record_id=item.get("memory_id"),
                source_type="memory",
                title=item.get("title", "Memory"),
                content=item.get("content", ""),
                workspace_id=workspace_id,
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at"),
                importance=item.get("importance", "medium"),
                tags=item.get("tags", []),
                metadata={"memory_type": item.get("type"), "source": item.get("source")},
            )
            for item in items
        ]

    def _message_records(self, workspace_id: str) -> list[dict[str, Any]]:
        messages = [item for item in self.storage.read_list("messages.json") if item.get("workspace_id") == workspace_id]
        return [
            self._record(
                record_id=item.get("message_id"),
                source_type="chat",
                title=f"{item.get('role', 'message').title()} message",
                content=item.get("content", ""),
                workspace_id=workspace_id,
                created_at=item.get("created_at"),
                updated_at=item.get("created_at"),
                importance="medium" if item.get("role") == "assistant" else "low",
                tags=[item.get("role", "message")],
                metadata={"session_id": item.get("session_id"), "run_id": item.get("run_id")},
            )
            for item in messages
            if item.get("content")
        ]

    def _file_records(self, workspace_id: str) -> list[dict[str, Any]]:
        files = [item for item in self.storage.read_list("files.json") if item.get("workspace_id") == workspace_id]
        return [
            self._record(
                record_id=item.get("file_id"),
                source_type="file",
                title=item.get("filename", "Uploaded file"),
                content=f"{item.get('text_preview', '')}\n{item.get('extension', '')} {item.get('content_type', '')}",
                workspace_id=workspace_id,
                created_at=item.get("created_at"),
                updated_at=item.get("created_at"),
                importance="medium",
                tags=[item.get("extension", "").lstrip("."), "file"],
                metadata={
                    "filename": item.get("filename"),
                    "extension": item.get("extension"),
                    "extracted_text_length": item.get("extracted_text_length", 0),
                },
            )
            for item in files
        ]

    def _recording_records(self, workspace_id: str) -> list[dict[str, Any]]:
        recordings = [item for item in self.storage.read_list("recordings.json") if item.get("workspace_id") == workspace_id]
        return [
            self._record(
                record_id=item.get("recording_id"),
                source_type="recording",
                title=item.get("filename", "Recording"),
                content=item.get("transcript_preview") or item.get("text_preview") or "",
                workspace_id=workspace_id,
                created_at=item.get("created_at"),
                updated_at=item.get("created_at"),
                importance="medium",
                tags=[item.get("extension", "").lstrip("."), "recording"],
                metadata={"filename": item.get("filename"), "transcript_length": item.get("transcript_length", 0)},
            )
            for item in recordings
        ]

    def _goal_records(self, workspace_id: str) -> list[dict[str, Any]]:
        goals = [item for item in self.storage.read_list("goals.json") if item.get("workspace_id") == workspace_id]
        return [
            self._record(
                record_id=item.get("goal_id"),
                source_type="goal",
                title=item.get("title", "Goal"),
                content=f"{item.get('description', '')}\nStatus: {item.get('status')}\nNext: {item.get('next_best_task', '')}",
                workspace_id=workspace_id,
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at"),
                importance="high" if item.get("status") == "active" else "medium",
                tags=item.get("tags", []) + ["goal"],
                metadata={"status": item.get("status"), "progress_percent": item.get("progress_percent")},
            )
            for item in goals
        ]

    def _custom_agent_records(self, workspace_id: str) -> list[dict[str, Any]]:
        agents = [item for item in self.storage.read_list("custom_agents.json") if item.get("workspace_id") == workspace_id]
        return [
            self._record(
                record_id=item.get("agent_id"),
                source_type="custom_agent",
                title=item.get("name", "Custom Agent"),
                content=f"{item.get('description', '')}\n{item.get('role', '')}",
                workspace_id=workspace_id,
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at"),
                importance="medium",
                tags=["custom_agent", item.get("approval_level", "read_only")],
                metadata={"enabled": item.get("enabled", True), "approval_level": item.get("approval_level")},
            )
            for item in agents
        ]

    def _record(
        self,
        *,
        record_id: str | None,
        source_type: str,
        title: str,
        content: str,
        workspace_id: str,
        created_at: str | None,
        updated_at: str | None,
        importance: str,
        tags: list[str],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        content_preview = " ".join(str(content or "").split())[:600]
        clean_tags = [tag for tag in tags if tag]
        return {
            "record_id": record_id or f"{source_type}:unknown",
            "workspace_id": workspace_id,
            "source_type": source_type,
            "title": title or source_type.replace("_", " ").title(),
            "content_preview": content_preview,
            "importance": importance,
            "importance_rank": {"high": 3, "medium": 2, "low": 1}.get(importance, 2),
            "tags": clean_tags,
            "created_at": created_at,
            "updated_at": updated_at,
            "metadata": metadata,
        }

    def _score(self, record: dict[str, Any], terms: set[str]) -> int:
        if not terms:
            return record.get("importance_rank", 1)
        haystack = f"{record.get('title', '')} {record.get('content_preview', '')} {' '.join(record.get('tags', []))}".lower()
        score = 0
        for term in terms:
            if term in haystack:
                score += 3 if term in str(record.get("title", "")).lower() else 1
        score += record.get("importance_rank", 1)
        return score

    def _terms(self, text: str | set[str]) -> set[str]:
        if isinstance(text, set):
            return text
        return {
            token.strip(".,:;!?()[]{}'\"").lower()
            for token in str(text or "").split()
            if len(token.strip(".,:;!?()[]{}'\"")) > 2
        }

    def _group_by_source(self, records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for record in records:
            grouped[record["source_type"]].append(record)
        return dict(grouped)
