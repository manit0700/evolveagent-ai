import subprocess
from pathlib import Path

from app.models.response_models import CommandResult


class SafeCommandRunner:
    allowed_commands = {
        "npm run build",
        "npm test",
        "npm run lint",
        "pytest",
        "python -m pytest",
    }

    def __init__(self, project_root: str | Path | None = None, timeout_seconds: int = 60):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parents[3]
        self.timeout_seconds = timeout_seconds

    def is_allowed(self, command: str) -> bool:
        return command.strip() in self.allowed_commands

    def run(self, command: str) -> CommandResult:
        command = command.strip()
        if not self.is_allowed(command):
            return CommandResult(
                command=command,
                exit_code=126,
                stdout="",
                stderr="Command blocked by allowlist.",
                success=False,
            )

        cwd = self.project_root
        if command.startswith("npm") and (self.project_root / "frontend").exists():
            cwd = self.project_root / "frontend"
        if "pytest" in command and (self.project_root / "backend").exists():
            cwd = self.project_root / "backend"

        try:
            completed = subprocess.run(
                command.split(),
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                check=False,
            )
            return CommandResult(
                command=command,
                exit_code=completed.returncode,
                stdout=completed.stdout[-4000:],
                stderr=completed.stderr[-4000:],
                success=completed.returncode == 0,
            )
        except subprocess.TimeoutExpired as error:
            return CommandResult(
                command=command,
                exit_code=124,
                stdout=(error.stdout or "")[-4000:] if isinstance(error.stdout, str) else "",
                stderr="Command timed out.",
                success=False,
            )
