from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.services.permission_service import PermissionService
from app.services.storage_service import StorageService


class ToolRegistryService:
    filename = "tool_registry.json"

    seed_tools = [
        {
            "name": "calculate",
            "description": "Safely evaluate arithmetic expressions.",
            "input_schema": {"type": "string", "description": "Arithmetic expression to evaluate."},
            "permission_level": "read_only",
            "source": "assistant_command",
        },
        {
            "name": "random_password",
            "description": "Generate a local random password.",
            "input_schema": {"type": "string", "description": "Optional length, for example length=18."},
            "permission_level": "read_only",
            "source": "assistant_command",
        },
        {
            "name": "system_info",
            "description": "Show safe local runtime information.",
            "input_schema": {"type": "string", "description": "No input required."},
            "permission_level": "read_only",
            "source": "assistant_command",
        },
        {
            "name": "convert_temp",
            "description": "Convert Celsius and Fahrenheit temperatures.",
            "input_schema": {"type": "string", "description": "Temperature conversion request."},
            "permission_level": "read_only",
            "source": "assistant_command",
        },
        {
            "name": "knowledge_search",
            "description": "Search the current workspace knowledge base.",
            "input_schema": {"type": "string", "description": "Workspace knowledge search query."},
            "permission_level": "read_only",
            "source": "assistant_command",
        },
    ]

    def __init__(self, storage: StorageService, permission_service: PermissionService | None = None):
        self.storage = storage
        self.permission_service = permission_service or PermissionService()
        self.ensure_seed_tools()

    def ensure_seed_tools(self) -> None:
        tools = self.storage.read_list(self.filename)
        existing = {item.get("name") for item in tools}
        changed = False
        for seed in self.seed_tools:
            if seed["name"] in existing:
                continue
            tools.append(self._tool_record(seed))
            changed = True
        if changed:
            self.storage.write_list(self.filename, tools)

    def list_tools(self, include_disabled: bool = False) -> list[dict[str, Any]]:
        self.ensure_seed_tools()
        tools = self.storage.read_list(self.filename)
        if not include_disabled:
            tools = [tool for tool in tools if tool.get("enabled", True)]
        return sorted(tools, key=lambda item: item.get("name", ""))

    def get_tool(self, name: str) -> dict[str, Any] | None:
        normalized = self.normalize_name(name)
        return next((tool for tool in self.list_tools(include_disabled=True) if tool.get("name") == normalized), None)

    def register_tool(self, data: dict[str, Any]) -> dict[str, Any]:
        normalized = self.normalize_name(data.get("name", ""))
        if not normalized:
            raise ValueError("Tool name is required.")
        permission_level = data.get("permission_level") or "read_only"
        if permission_level not in {"read_only", "plan_only", "approve_to_edit", "approve_to_run", "blocked"}:
            raise ValueError("Invalid permission level.")

        tools = self.storage.read_list(self.filename)
        existing = next((tool for tool in tools if tool.get("name") == normalized), None)
        now = datetime.now(UTC).isoformat()
        if existing:
            for key in ("description", "input_schema", "permission_level", "enabled", "source"):
                if key in data and data[key] is not None:
                    existing[key] = data[key]
            existing["name"] = normalized
            existing["updated_at"] = now
            self.storage.write_list(self.filename, tools)
            return existing

        record = self._tool_record({**data, "name": normalized, "permission_level": permission_level})
        tools.append(record)
        self.storage.write_list(self.filename, tools)
        return record

    def register_plugin_tool(self, plugin_name: str, tool: dict[str, Any]) -> dict[str, Any]:
        return self.register_tool(
            {
                "name": tool.get("name"),
                "description": tool.get("description") or f"Plugin tool from {plugin_name}.",
                "input_schema": tool.get("input_schema") or {},
                "permission_level": tool.get("permission_level") or "read_only",
                "enabled": tool.get("enabled", True),
                "source": "plugin",
                "plugin_name": plugin_name,
            }
        )

    def _tool_record(self, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        return {
            "tool_id": data.get("tool_id") or str(uuid4()),
            "name": self.normalize_name(data.get("name", "")),
            "description": data.get("description") or "",
            "input_schema": data.get("input_schema") or {},
            "permission_level": data.get("permission_level") or "read_only",
            "enabled": data.get("enabled", True),
            "source": data.get("source") or "built_in",
            "plugin_name": data.get("plugin_name"),
            "created_at": data.get("created_at") or now,
            "updated_at": now,
        }

    @staticmethod
    def normalize_name(name: str) -> str:
        return str(name or "").strip().lower().replace("-", "_").replace(" ", "_")
