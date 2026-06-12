from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.models.response_models import GovernanceEvent
from app.services.governance_service import GovernanceService
from app.services.storage_service import StorageService
from app.services.tool_registry_service import ToolRegistryService


class PluginLoaderService:
    filename = "plugin_manifests.json"

    def __init__(
        self,
        storage: StorageService,
        tool_registry: ToolRegistryService,
        governance: GovernanceService | None = None,
        plugin_dir: str | Path = "plugins",
    ):
        self.storage = storage
        self.tool_registry = tool_registry
        self.governance = governance
        self.plugin_dir = Path(plugin_dir)

    def load_plugins(self) -> list[dict[str, Any]]:
        self.plugin_dir.mkdir(exist_ok=True)
        loaded: list[dict[str, Any]] = []
        for path in sorted(self.plugin_dir.glob("*.json")):
            try:
                manifest = self._load_manifest(path)
                loaded.append(manifest)
                for tool in manifest.get("tools", []):
                    self.tool_registry.register_plugin_tool(manifest["name"], tool)
            except ValueError as exc:
                self._log_invalid_plugin(path, str(exc))
        self.storage.write_list(self.filename, loaded)
        return loaded

    def list_manifests(self) -> list[dict[str, Any]]:
        return self.storage.read_list(self.filename)

    def _load_manifest(self, path: Path) -> dict[str, Any]:
        try:
            with path.open("r", encoding="utf-8") as file:
                manifest = json.load(file)
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError(f"Invalid plugin manifest JSON: {exc}") from exc
        self._validate_manifest(manifest)
        now = datetime.now(UTC).isoformat()
        return {
            "name": self.tool_registry.normalize_name(manifest["name"]),
            "description": manifest.get("description", ""),
            "version": manifest.get("version", "0.1.0"),
            "tools": manifest.get("tools", []),
            "manifest_path": str(path),
            "loaded_at": now,
        }

    def _validate_manifest(self, manifest: dict[str, Any]) -> None:
        if not isinstance(manifest, dict):
            raise ValueError("Plugin manifest must be a JSON object.")
        if not manifest.get("name"):
            raise ValueError("Plugin manifest requires a name.")
        tools = manifest.get("tools", [])
        if not isinstance(tools, list):
            raise ValueError("Plugin manifest tools must be a list.")
        for tool in tools:
            if not isinstance(tool, dict) or not tool.get("name"):
                raise ValueError("Every plugin tool requires a name.")
            permission = tool.get("permission_level", "read_only")
            if permission not in {"read_only", "plan_only", "approve_to_edit", "approve_to_run", "blocked"}:
                raise ValueError(f"Invalid permission level for plugin tool {tool.get('name')}.")

    def _log_invalid_plugin(self, path: Path, reason: str) -> None:
        if not self.governance:
            return
        self.governance.log_event(
            GovernanceEvent(
                agent_name="Plugin Loader Service",
                action_type="plugin_manifest_invalid",
                tool_used="PluginLoaderService",
                permission_level="read_only",
                blocked=True,
                risk_score=25,
                reason=f"Skipped plugin manifest {path}: {reason}",
            )
        )
