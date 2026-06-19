from __future__ import annotations

import json
import re
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
        raw_name = str(manifest.get("name") or "").strip()
        if not raw_name:
            raise ValueError("Plugin manifest requires a name.")
        if len(raw_name) > 80:
            raise ValueError("Plugin manifest name is too long.")
        normalized_plugin = self.tool_registry.normalize_name(raw_name)
        if not self._valid_normalized_name(normalized_plugin):
            raise ValueError("Plugin manifest name contains unsupported characters.")
        version = str(manifest.get("version", "0.1.0"))
        if len(version) > 40:
            raise ValueError("Plugin manifest version is too long.")
        if not isinstance(manifest.get("description", ""), str):
            raise ValueError("Plugin manifest description must be text.")
        tools = manifest.get("tools", [])
        if not isinstance(tools, list):
            raise ValueError("Plugin manifest tools must be a list.")
        if len(tools) > 25:
            raise ValueError("Plugin manifests can register at most 25 tools.")
        seen_tool_names = set()
        for tool in tools:
            if not isinstance(tool, dict) or not tool.get("name"):
                raise ValueError("Every plugin tool requires a name.")
            normalized_tool = self.tool_registry.normalize_name(tool.get("name", ""))
            if not self._valid_normalized_name(normalized_tool):
                raise ValueError(f"Invalid plugin tool name {tool.get('name')}.")
            if normalized_tool in seen_tool_names:
                raise ValueError(f"Duplicate plugin tool name {normalized_tool}.")
            seen_tool_names.add(normalized_tool)
            if not isinstance(tool.get("description", ""), str):
                raise ValueError(f"Plugin tool {tool.get('name')} description must be text.")
            if "input_schema" in tool and not isinstance(tool.get("input_schema"), dict):
                raise ValueError(f"Plugin tool {tool.get('name')} input_schema must be an object.")
            permission = tool.get("permission_level", "read_only")
            if permission not in {"read_only", "plan_only", "approve_to_edit", "approve_to_run", "blocked"}:
                raise ValueError(f"Invalid permission level for plugin tool {tool.get('name')}.")

    def _valid_normalized_name(self, name: str) -> bool:
        return bool(re.fullmatch(r"[a-z0-9_]{1,80}", name or ""))

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
