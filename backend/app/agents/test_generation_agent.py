from __future__ import annotations

from pathlib import Path


class TestGenerationAgent:
    """Suggest focused tests from changed files without generating code automatically."""

    def suggest_tests(self, changed_files: list[str]) -> dict:
        suggestions: list[dict] = []
        for path in changed_files:
            normalized = path.replace("\\", "/")
            suggestions.append(
                {
                    "source_file": normalized,
                    "test_target": self._target_for(normalized),
                    "reason": self._reason_for(normalized),
                    "priority": self._priority_for(normalized),
                }
            )
        return {
            "agent_name": "Test Generation Agent",
            "changed_files": changed_files,
            "suggestions": suggestions,
            "summary": self._summary(suggestions),
        }

    def _target_for(self, path: str) -> str:
        if path.startswith("backend/app/api/"):
            return "backend/tests/test_api.py"
        if path.startswith("backend/app/services/"):
            stem = Path(path).stem
            return f"backend/tests/test_{stem}.py"
        if path.startswith("backend/app/agents/"):
            return "backend/tests/test_agents.py"
        if path.startswith("frontend/src/"):
            return "frontend build smoke test"
        if path.endswith(".md"):
            return "documentation review"
        return "nearest existing test file"

    def _reason_for(self, path: str) -> str:
        if "/api/" in path:
            return "API contract changed; add status-code and response-shape coverage."
        if "/services/" in path:
            return "Service logic changed; add unit coverage for success and failure paths."
        if "/agents/" in path:
            return "Agent behavior changed; add deterministic mock-mode workflow coverage."
        if path.startswith("frontend/src/"):
            return "Frontend changed; run production build and manually verify affected UI."
        if path.endswith(".md"):
            return "Docs changed; verify examples and commands still match implementation."
        return "Changed file should have at least one focused regression check."

    def _priority_for(self, path: str) -> str:
        if path.startswith("backend/app/api/") or path.startswith("backend/app/services/"):
            return "high"
        if path.startswith("backend/app/agents/"):
            return "medium"
        return "low"

    def _summary(self, suggestions: list[dict]) -> str:
        if not suggestions:
            return "No changed files were provided, so no test suggestions were generated."
        high_count = sum(1 for item in suggestions if item.get("priority") == "high")
        return f"Generated {len(suggestions)} test suggestion(s), including {high_count} high-priority target(s)."
