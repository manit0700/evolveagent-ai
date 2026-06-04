from datetime import UTC, datetime
from uuid import uuid4

from app.services.storage_service import StorageService


class PromptVersionService:
    def __init__(self, storage: StorageService):
        self.storage = storage

    def propose(self, agent_name: str, reason: str, proposed_prompt: str) -> dict:
        versions = self.storage.read_list("prompt_versions.json")
        item = {
            "version_id": f"v-{uuid4().hex[:8]}",
            "agent_name": agent_name,
            "reason": reason,
            "prompt": proposed_prompt,
            "status": "proposed",
            "created_at": datetime.now(UTC).isoformat(),
            "activated_at": None,
        }
        versions.append(item)
        self.storage.write_list("prompt_versions.json", versions)
        return item

    def set_status(self, agent_name: str, version_id: str, status: str) -> dict:
        versions = self.storage.read_list("prompt_versions.json")
        target = None
        for item in versions:
            if item.get("agent_name") == agent_name and item.get("version_id") == version_id:
                target = item
                item["status"] = status
                if status == "active":
                    item["activated_at"] = datetime.now(UTC).isoformat()
                break
        if target is None:
            raise ValueError("Prompt version not found")
        if status == "active":
            for item in versions:
                if item is not target and item.get("agent_name") == agent_name and item.get("status") == "active":
                    item["status"] = "inactive"
        self.storage.write_list("prompt_versions.json", versions)
        return target

    def rollback(self, agent_name: str, version_id: str) -> dict:
        return self.set_status(agent_name, version_id, "rolled_back")

    def list_versions(self) -> list[dict]:
        return self.storage.read_list("prompt_versions.json")
