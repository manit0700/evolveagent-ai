from __future__ import annotations

import ast
import math
import operator
import platform
import secrets
import string
from datetime import UTC, datetime
from typing import Any, Callable

from app.services.knowledge_service import KnowledgeService
from app.services.workspace_service import WorkspaceService


class AssistantCommandService:
    """Jarvis-inspired allowlisted personal assistant command layer."""

    def __init__(self, workspace_service: WorkspaceService, knowledge_service: KnowledgeService):
        self.workspace_service = workspace_service
        self.knowledge_service = knowledge_service
        self._commands: dict[str, dict[str, Any]] = {
            "help": {
                "name": "help",
                "description": "List available assistant tools.",
                "examples": ["help"],
                "handler": self._help,
            },
            "calculate": {
                "name": "calculate",
                "description": "Safely evaluate basic arithmetic.",
                "examples": ["calculate 24 * (7 + 3)", "calculate sqrt(144)"],
                "handler": self._calculate,
            },
            "random_password": {
                "name": "random_password",
                "description": "Generate a local random password.",
                "examples": ["random_password length=18"],
                "handler": self._random_password,
            },
            "system_info": {
                "name": "system_info",
                "description": "Show safe local runtime information.",
                "examples": ["system_info"],
                "handler": self._system_info,
            },
            "convert_temp": {
                "name": "convert_temp",
                "description": "Convert Celsius and Fahrenheit temperatures.",
                "examples": ["convert_temp 72 f to c", "convert_temp 20 c to f"],
                "handler": self._convert_temp,
            },
            "knowledge_search": {
                "name": "knowledge_search",
                "description": "Search the current workspace knowledge base.",
                "examples": ["knowledge_search resume", "knowledge_search architecture"],
                "handler": self._knowledge_search,
            },
        }

    def list_commands(self) -> list[dict[str, Any]]:
        return [
            {
                "name": command["name"],
                "description": command["description"],
                "examples": command["examples"],
            }
            for command in self._commands.values()
        ]

    def run(self, command: str, input_text: str = "", workspace_id: str | None = None) -> dict[str, Any]:
        key = command.strip().lower().replace("-", "_")
        if key not in self._commands:
            return {
                "success": False,
                "command": command,
                "output": f"Unknown command: {command}. Try `help`.",
                "error": "unknown_command",
                "created_at": datetime.now(UTC).isoformat(),
            }
        handler: Callable[[str, str | None], dict[str, Any]] = self._commands[key]["handler"]
        try:
            result = handler(input_text or "", workspace_id)
            return {
                "success": True,
                "command": key,
                "output": result.get("output", ""),
                "data": result.get("data", {}),
                "created_at": datetime.now(UTC).isoformat(),
            }
        except ValueError as error:
            return {
                "success": False,
                "command": key,
                "output": str(error),
                "error": "invalid_input",
                "created_at": datetime.now(UTC).isoformat(),
            }

    def _help(self, _: str, __: str | None) -> dict[str, Any]:
        commands = self.list_commands()
        lines = ["Available assistant tools:"]
        lines.extend(f"- {item['name']}: {item['description']}" for item in commands)
        return {"output": "\n".join(lines), "data": {"commands": commands}}

    def _calculate(self, input_text: str, _: str | None) -> dict[str, Any]:
        expression = input_text.strip()
        if expression.lower().startswith("calculate "):
            expression = expression[10:].strip()
        if not expression:
            raise ValueError("Provide an arithmetic expression, for example: calculate 2 + 2")
        value = _SafeEvaluator().evaluate(expression)
        return {"output": f"{expression} = {value}", "data": {"expression": expression, "value": value}}

    def _random_password(self, input_text: str, _: str | None) -> dict[str, Any]:
        length = 16
        for part in input_text.replace(",", " ").split():
            if part.startswith("length="):
                try:
                    length = int(part.split("=", 1)[1])
                except ValueError as error:
                    raise ValueError("Password length must be a number.") from error
        if length < 8 or length > 64:
            raise ValueError("Password length must be between 8 and 64.")
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        return {"output": password, "data": {"length": length}}

    def _system_info(self, _: str, __: str | None) -> dict[str, Any]:
        data = {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "python": platform.python_version(),
        }
        output = "\n".join(f"{key}: {value}" for key, value in data.items())
        return {"output": output, "data": data}

    def _convert_temp(self, input_text: str, _: str | None) -> dict[str, Any]:
        parts = input_text.lower().replace("°", " ").replace("to", " ").split()
        numbers = [part for part in parts if _is_float(part)]
        units = [part for part in parts if part in {"c", "celsius", "f", "fahrenheit"}]
        if not numbers or not units:
            raise ValueError("Use format like: convert_temp 72 f to c")
        value = float(numbers[0])
        source = units[0]
        if source.startswith("f"):
            result = (value - 32) * 5 / 9
            target = "C"
        else:
            result = (value * 9 / 5) + 32
            target = "F"
        rounded = round(result, 2)
        return {"output": f"{value:g}°{source[0].upper()} = {rounded:g}°{target}", "data": {"value": rounded, "unit": target}}

    def _knowledge_search(self, input_text: str, workspace_id: str | None) -> dict[str, Any]:
        query = input_text.strip()
        if query.lower().startswith("knowledge_search "):
            query = query[17:].strip()
        if not query:
            raise ValueError("Provide a search query, for example: knowledge_search resume")
        result = self.knowledge_service.search(workspace_id, query=query, limit=5)
        lines = [f"Top knowledge results for `{query}`:"]
        for item in result.get("results", []):
            lines.append(f"- {item['title']} ({item['source_type']}, score {item['score']})")
        if len(lines) == 1:
            lines.append("- No matching records found.")
        return {"output": "\n".join(lines), "data": result}


class _SafeEvaluator:
    operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }
    functions = {
        "sqrt": math.sqrt,
        "abs": abs,
        "round": round,
    }

    def evaluate(self, expression: str) -> float | int:
        try:
            tree = ast.parse(expression, mode="eval")
        except SyntaxError as error:
            raise ValueError("Invalid arithmetic expression.") from error
        return self._eval(tree.body)

    def _eval(self, node: ast.AST) -> float | int:
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in self.operators:
            return self.operators[type(node.op)](self._eval(node.left), self._eval(node.right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in self.operators:
            return self.operators[type(node.op)](self._eval(node.operand))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in self.functions:
            args = [self._eval(arg) for arg in node.args]
            return self.functions[node.func.id](*args)
        raise ValueError("Only basic arithmetic is allowed.")


def _is_float(value: str) -> bool:
    try:
        float(value)
        return True
    except ValueError:
        return False
