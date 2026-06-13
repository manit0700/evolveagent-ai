from datetime import UTC, datetime
import difflib
import re
from pathlib import Path
from typing import Any

from app.models.response_models import AutomationApplyResult, AutomationPlan


class SafeFileEditor:
    max_patch_count = 5
    blocked_names = {".env", ".git", "node_modules", "venv", "__pycache__"}
    blocked_prefixes = {
        "backend/app/uploads",
        "backend/app/data",
    }

    def __init__(self, project_root: str | Path | None = None, backup_dir: str | Path | None = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parents[3]
        self.backup_dir = Path(backup_dir) if backup_dir else self.project_root / "backend" / ".logs" / "file_backups"

    def validate_relative_path(self, relative_path: str) -> Path:
        if not relative_path.strip():
            raise ValueError("Unsafe empty path cannot be edited.")
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

    def apply_patches(self, patches: list[dict[str, Any]]) -> AutomationApplyResult:
        if len(patches) > self.max_patch_count:
            return AutomationApplyResult(
                success=False,
                errors=[f"Too many file patches. Maximum is {self.max_patch_count}."],
                summary="Automation was blocked because the patch set exceeds the safe file-change limit.",
            )

        errors: list[str] = []
        prepared: list[dict[str, Any]] = []
        for patch in patches:
            try:
                prepared.append(self._prepare_patch(patch))
            except ValueError as error:
                errors.append(str(error))

        if errors:
            return AutomationApplyResult(
                success=False,
                errors=errors,
                summary="Automation was blocked because one or more file patches failed safety validation.",
            )

        changed_files: list[str] = []
        created_files: list[str] = []
        backup_paths: list[str] = []
        diff_paths: list[str] = []
        for item in prepared:
            path = item["path"]
            relative_path = item["relative_path"]
            before = item["before"]
            after = item["after"]
            existed = item["existed"]

            if before == after:
                continue

            backup_path, diff_path = self._write_audit_files(relative_path, before, after, existed)
            if backup_path:
                backup_paths.append(backup_path)
            if diff_path:
                diff_paths.append(diff_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(after, encoding="utf-8")
            if existed:
                changed_files.append(relative_path)
            else:
                created_files.append(relative_path)

        return AutomationApplyResult(
            success=True,
            changed_files=changed_files,
            created_files=created_files,
            backup_paths=backup_paths,
            diff_paths=diff_paths,
            errors=[],
            summary=(
                f"Applied {len(changed_files)} changed file(s) and {len(created_files)} created file(s). "
                "Backups and diffs were written before editing."
            ),
        )

    def _prepare_patch(self, patch: dict[str, Any]) -> dict[str, Any]:
        relative_path = str(patch.get("path") or patch.get("relative_path") or "").strip()
        path = self.validate_relative_path(relative_path)
        content = patch.get("content")
        find = patch.get("find")
        replace = patch.get("replace")

        if content is not None and (find is not None or replace is not None):
            raise ValueError(f"Patch for {relative_path} must use either full content or find/replace, not both.")
        if content is None and (find is None or replace is None):
            raise ValueError(f"Patch for {relative_path} requires content or both find and replace.")

        existed = path.exists()
        before = path.read_text(encoding="utf-8") if existed else ""
        if content is not None:
            after = str(content)
        else:
            if not existed:
                raise ValueError(f"Cannot find/replace in missing file: {relative_path}")
            find_text = str(find)
            if find_text not in before:
                raise ValueError(f"Find text was not present in file: {relative_path}")
            after = before.replace(find_text, str(replace), 1)

        return {
            "path": path,
            "relative_path": path.relative_to(self.project_root.resolve()).as_posix(),
            "before": before,
            "after": after,
            "existed": existed,
        }

    def _write_audit_files(self, relative_path: str, before: str, after: str, existed: bool) -> tuple[str | None, str | None]:
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
        safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", relative_path).strip("_") or "patch"
        backup_path: Path | None = None
        if existed:
            backup_path = self.backup_dir / f"{stamp}_{safe_name}.bak"
            backup_path.write_text(before, encoding="utf-8")

        diff_lines = difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"a/{relative_path}",
            tofile=f"b/{relative_path}",
        )
        diff_path = self.backup_dir / f"{stamp}_{safe_name}.diff"
        diff_path.write_text("".join(diff_lines), encoding="utf-8")

        root = self.project_root.resolve()
        return (
            backup_path.relative_to(root).as_posix() if backup_path else None,
            diff_path.relative_to(root).as_posix(),
        )
