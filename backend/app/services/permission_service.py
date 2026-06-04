from pathlib import Path


class PermissionService:
    blocked_path_parts = {".env", ".git", "node_modules", "venv", "__pycache__"}
    blocked_actions = {"delete", "secret_access", "unknown_command", "package_install"}
    dangerous_command_fragments = ("rm ", "rm -", "del ", "git push", "npm install", "pip install", "curl ", "wget ")

    def permission_for_action(self, action_type: str, command: str | None = None, path: str | None = None) -> str:
        normalized = action_type.lower().strip()
        if normalized in {"file_scan", "file_analysis", "recording_analysis", "project_scan"}:
            return "read_only"
        if normalized in {"automation_plan", "prompt_planning"}:
            return "plan_only"
        if normalized in {"file_edit", "apply_patch"}:
            return "blocked" if self.is_unsafe_path(path) else "approve_to_edit"
        if normalized in {"command_run", "test_run", "build_run"}:
            return "blocked" if self.is_unsafe_command(command or "") else "approve_to_run"
        if normalized in self.blocked_actions:
            return "blocked"
        return "read_only"

    def is_unsafe_path(self, path: str | None) -> bool:
        if not path:
            return False
        if ".." in Path(path).parts:
            return True
        return bool(set(Path(path).parts) & self.blocked_path_parts)

    def is_unsafe_command(self, command: str) -> bool:
        lowered = command.lower().strip()
        return any(fragment in lowered for fragment in self.dangerous_command_fragments)
