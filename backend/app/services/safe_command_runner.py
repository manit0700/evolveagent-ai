import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.models.response_models import CommandResult


@dataclass(frozen=True)
class AllowedCommand:
    argv: tuple[str, ...]
    cwd: str


class SafeCommandRunner:
    allowed_commands: dict[str, AllowedCommand] = {
        "pytest": AllowedCommand(("pytest",), "backend"),
        "npm run build": AllowedCommand(("npm", "run", "build"), "frontend"),
    }

    def __init__(self, project_root: str | Path | None = None, timeout_seconds: int = 60):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parents[3]
        self.timeout_seconds = timeout_seconds

    def normalize_command(self, command: str) -> str:
        return " ".join(command.strip().split())

    def is_allowed(self, command: str) -> bool:
        return self.normalize_command(command) in self.allowed_commands

    def run(self, command: str) -> CommandResult:
        command = self.normalize_command(command)
        spec = self.allowed_commands.get(command)
        if spec is None:
            return CommandResult(
                command=command,
                exit_code=126,
                stdout="",
                stderr="Command blocked by allowlist. Allowed commands: pytest, npm run build.",
                success=False,
            )

        cwd = self._cwd_for(spec)

        try:
            completed = subprocess.run(
                list(spec.argv),
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
            output = getattr(error, "stdout", None) or getattr(error, "output", None) or ""
            return CommandResult(
                command=command,
                exit_code=124,
                stdout=output[-4000:] if isinstance(output, str) else "",
                stderr="Command timed out.",
                success=False,
            )

    def _cwd_for(self, spec: AllowedCommand) -> Path:
        candidate = self.project_root / spec.cwd
        return candidate if candidate.exists() else self.project_root
