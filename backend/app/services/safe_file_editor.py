from pathlib import Path

from app.models.response_models import AutomationApplyResult, AutomationPlan


class SafeFileEditor:
    blocked_names = {".env", ".git", "node_modules", "venv", "__pycache__"}
    blocked_prefixes = {
        "backend/app/uploads",
        "backend/app/data/files.json",
        "backend/app/data/feedback.json",
        "backend/app/data/agent_analytics.json",
    }

    def __init__(self, project_root: str | Path | None = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parents[3]

    def validate_relative_path(self, relative_path: str) -> Path:
        candidate = (self.project_root / relative_path).resolve()
        root = self.project_root.resolve()
        if root not in candidate.parents and candidate != root:
            raise ValueError(f"Unsafe path outside project root: {relative_path}")
        parts = set(candidate.parts)
        if parts & self.blocked_names:
            raise ValueError(f"Blocked path cannot be edited: {relative_path}")
        normalized = candidate.relative_to(root).as_posix()
        if any(normalized == prefix or normalized.startswith(f"{prefix}/") for prefix in self.blocked_prefixes):
            raise ValueError(f"Blocked local data/upload path cannot be edited: {relative_path}")
        return candidate

    def apply_plan_conservatively(self, plan: AutomationPlan) -> AutomationApplyResult:
        errors: list[str] = []
        validated_changes: list[str] = []
        for relative_path in plan.files_to_change[:5]:
            try:
                self.validate_relative_path(relative_path)
                validated_changes.append(relative_path)
            except ValueError as error:
                errors.append(str(error))

        for relative_path in plan.files_to_create[:5]:
            try:
                self.validate_relative_path(relative_path)
            except ValueError as error:
                errors.append(str(error))

        if errors:
            return AutomationApplyResult(
                success=False,
                changed_files=[],
                created_files=[],
                errors=errors,
                summary="Automation was blocked because one or more planned paths failed safety validation.",
            )

        return AutomationApplyResult(
            success=True,
            changed_files=[],
            created_files=[],
            errors=[],
            summary=(
                "Plan approved and safety-validated. MVP v2.0 did not write files automatically; "
                f"{len(validated_changes)} planned file path(s) are ready for a future diff approval step."
            ),
        )
