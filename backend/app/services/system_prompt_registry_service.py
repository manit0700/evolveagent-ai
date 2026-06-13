from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.services.prompt_version_service import PromptVersionService
from app.services.storage_service import StorageService


class SystemPromptRegistryService:
    filename = "system_prompt_registry.json"

    def __init__(self, storage: StorageService, prompt_versions: PromptVersionService):
        self.storage = storage
        self.prompt_versions = prompt_versions

    def list_prompts(self) -> list[dict[str, Any]]:
        prompts = self.storage.read_list(self.filename)
        active_versions = {
            item.get("agent_name"): item
            for item in self.prompt_versions.list_versions()
            if item.get("status") == "active"
        }
        merged = []
        seen = set()
        for prompt in prompts:
            agent_name = prompt.get("agent_name")
            seen.add(agent_name)
            active = active_versions.get(agent_name)
            merged.append({**prompt, "active_version": active})
        for agent_name, active in active_versions.items():
            if agent_name not in seen:
                merged.append(
                    {
                        "prompt_id": str(uuid4()),
                        "agent_name": agent_name,
                        "prompt": active.get("prompt", ""),
                        "source": "prompt_version",
                        "created_at": active.get("created_at"),
                        "updated_at": active.get("activated_at") or active.get("created_at"),
                        "active_version": active,
                    }
                )
        return sorted(merged, key=lambda item: item.get("agent_name", ""))

    def get_prompt(self, agent_name: str, fallback: str = "") -> str:
        active = next(
            (
                item
                for item in self.prompt_versions.list_versions()
                if item.get("agent_name") == agent_name and item.get("status") == "active"
            ),
            None,
        )
        if active:
            return active.get("prompt") or fallback
        prompt = next((item for item in self.storage.read_list(self.filename) if item.get("agent_name") == agent_name), None)
        return (prompt or {}).get("prompt") or fallback

    def upsert_prompt(self, agent_name: str, prompt: str, reason: str | None = None) -> dict[str, Any]:
        prompts = self.storage.read_list(self.filename)
        existing = next((item for item in prompts if item.get("agent_name") == agent_name), None)
        now = datetime.now(UTC).isoformat()
        if existing:
            existing["prompt"] = prompt
            existing["reason"] = reason
            existing["updated_at"] = now
        else:
            existing = {
                "prompt_id": str(uuid4()),
                "agent_name": agent_name,
                "prompt": prompt,
                "reason": reason,
                "source": "registry",
                "created_at": now,
                "updated_at": now,
            }
            prompts.append(existing)
        self.storage.write_list(self.filename, prompts)
        return existing
