from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.services.assistant_command_service import AssistantCommandService
from app.services.permission_service import PermissionService
from app.services.secret_scanner import SecretScanner
from app.services.tool_execution_service import ToolExecutionService
from app.services.tool_registry_service import ToolRegistryService


class ToolRouterService:
    def __init__(
        self,
        tool_registry: ToolRegistryService,
        assistant_commands: AssistantCommandService,
        permission_service: PermissionService | None = None,
        secret_scanner: SecretScanner | None = None,
        execution_service: ToolExecutionService | None = None,
    ):
        self.tool_registry = tool_registry
        self.assistant_commands = assistant_commands
        self.permission_service = permission_service or PermissionService()
        self.secret_scanner = secret_scanner or SecretScanner()
        self.execution_service = execution_service

    def route_and_run(self, user_input: str, workspace_id: str | None = None) -> list[dict[str, Any]]:
        traces = []
        for tool_name, tool_input in self.select_tools(user_input):
            tool = self.tool_registry.get_tool(tool_name)
            if not tool or not tool.get("enabled", True):
                continue
            sanitized_input, _ = self.secret_scanner.redact(tool_input)
            permission_level = tool.get("permission_level", "read_only")
            blocked = permission_level == "blocked"
            approval_required = permission_level in {"approve_to_edit", "approve_to_run"}
            trace = {
                "execution_id": str(uuid4()),
                "tool_name": tool["name"],
                "source": tool.get("source", "built_in"),
                "permission_level": permission_level,
                "selected": True,
                "executed": False,
                "blocked": blocked,
                "approval_required": approval_required,
                "sanitized_input": sanitized_input[:500],
                "result_summary": "",
                "success": False,
                "quality_score": 0,
                "quality_notes": "",
                "created_at": datetime.now(UTC).isoformat(),
            }
            if blocked:
                trace["result_summary"] = "Tool was blocked by its permission level."
                trace["quality_notes"] = "Blocked tools are not executed."
            elif approval_required:
                trace["result_summary"] = "Tool requires approval before execution."
                trace["quality_score"] = 50
                trace["quality_notes"] = "Approval is required before this tool can run."
            elif tool.get("source") == "assistant_command" and permission_level == "read_only":
                result = self.assistant_commands.run(tool["name"], sanitized_input, workspace_id=workspace_id)
                success = bool(result.get("success"))
                trace["executed"] = success
                trace["success"] = success
                trace["blocked"] = not success
                trace["result_summary"] = str(result.get("output", ""))[:800]
                trace["quality_score"], trace["quality_notes"] = self._quality(result)
            else:
                trace["result_summary"] = "Tool selected for routing context; no automatic execution is available for this source."
                trace["quality_score"] = 40
                trace["quality_notes"] = "No automatic executor is registered for this tool source."
            if self.execution_service:
                self.execution_service.record(trace, workspace_id=workspace_id)
            traces.append(trace)
        return traces

    def select_tools(self, user_input: str) -> list[tuple[str, str]]:
        text = user_input.strip()
        lowered = text.lower()
        selections: list[tuple[str, str]] = []

        if self._looks_like_calculation(lowered):
            selections.append(("calculate", self._strip_prefix(text, ("calculate", "calc", "what is", "what's"))))
        if "password" in lowered and any(word in lowered for word in ("generate", "random", "create", "make")):
            selections.append(("random_password", text))
        if any(phrase in lowered for phrase in ("system info", "runtime info", "machine info", "computer info")):
            selections.append(("system_info", text))
        if "convert" in lowered and any(unit in lowered for unit in (" c ", " f ", "celsius", "fahrenheit", "°")):
            selections.append(("convert_temp", text))
        if any(phrase in lowered for phrase in ("search memory", "search knowledge", "knowledge search", "find in memory", "project brain")):
            selections.append(("knowledge_search", self._knowledge_query(text)))
        for tool in self.tool_registry.list_tools():
            name = tool.get("name", "")
            if not name:
                continue
            phrase = name.replace("_", " ")
            if name in {item[0] for item in selections}:
                continue
            if name in lowered or phrase in lowered:
                selections.append((name, text))

        seen = set()
        unique = []
        for name, value in selections:
            if name in seen:
                continue
            seen.add(name)
            unique.append((name, value.strip()))
        return unique

    def _looks_like_calculation(self, lowered: str) -> bool:
        if lowered.startswith(("calculate ", "calc ")):
            return True
        if re.search(r"\d+\s*[\+\-\*/%]\s*\d+", lowered):
            return True
        return bool(re.search(r"\b(sqrt|round|abs)\s*\(", lowered))

    def _strip_prefix(self, text: str, prefixes: tuple[str, ...]) -> str:
        result = text.strip()
        lowered = result.lower()
        for prefix in prefixes:
            if lowered.startswith(prefix):
                return result[len(prefix):].strip(" :")
        return result

    def _knowledge_query(self, text: str) -> str:
        result = text.strip()
        lowered = result.lower()
        for prefix in ("knowledge_search", "knowledge search", "search knowledge", "search memory", "find in memory"):
            if lowered.startswith(prefix):
                return result[len(prefix):].strip(" :")
        return result

    def _quality(self, result: dict[str, Any]) -> tuple[int, str]:
        if not result.get("success"):
            return 20, str(result.get("error") or "Tool execution failed.")
        output = str(result.get("output", "")).strip()
        if not output:
            return 55, "Tool executed but returned no visible output."
        if len(output) < 8:
            return 75, "Tool returned a short result."
        return 95, "Tool executed successfully and returned a useful result."
