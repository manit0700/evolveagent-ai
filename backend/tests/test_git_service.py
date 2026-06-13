from __future__ import annotations

from unittest.mock import MagicMock

from app.config import settings
from app.services.git_service import GitService


def test_git_service_blocks_unsafe_paths():
    service = GitService()

    assert service.is_safe_path("README.md") is True
    assert service.is_safe_path("backend/app/main.py") is True
    assert service.is_safe_path(".env") is False
    assert service.is_safe_path("backend/.env") is False
    assert service.is_safe_path("node_modules/react/index.js") is False
    assert service.is_safe_path("backend/app/data/tasks.json") is False
    assert service.is_safe_path("../outside.txt") is False


def test_git_push_skips_when_auto_push_disabled(monkeypatch):
    monkeypatch.setattr(settings, "auto_git_push", False)
    service = GitService()
    service._run = MagicMock()

    result = service.push()

    assert result["success"] is False
    assert result["skipped"] is True
    assert "AUTO_GIT_PUSH=false" in result["message"]
    service._run.assert_not_called()


def test_git_create_branch_normalizes_name():
    service = GitService()
    service._run = MagicMock(return_value=MagicMock(returncode=0, stdout="created", stderr=""))

    result = service.create_branch("Linear EVO 171")

    assert result["success"] is True
    assert result["branch"] == "linear-evo-171"
    service._run.assert_called_once_with("checkout", "-b", "linear-evo-171")


def test_git_create_branch_rejects_unsafe_name():
    service = GitService()
    service._run = MagicMock()

    result = service.create_branch("../main")

    assert result["success"] is False
    assert result["branch"] == ""
    assert "Unsafe branch name" in result["message"]
    service._run.assert_not_called()


def test_git_checkout_branch_rejects_unsafe_name():
    service = GitService()
    service._run = MagicMock()

    result = service.checkout_branch("-bad-branch")

    assert result["success"] is False
    assert result["branch"] == ""
    assert "Unsafe branch name" in result["message"]
    service._run.assert_not_called()


def test_git_add_safe_files_excludes_unsafe_paths():
    service = GitService()

    def fake_run(*args):
        if args == ("status", "--porcelain"):
            return MagicMock(
                returncode=0,
                stdout=" M README.md\n M backend/.env\n?? backend/app/services/git_service.py\n?? backend/app/data/local.json\n",
                stderr="",
            )
        if args[0] == "add":
            return MagicMock(returncode=0, stdout="", stderr="")
        raise AssertionError(f"unexpected git command: {args}")

    service._run = MagicMock(side_effect=fake_run)

    result = service.add_safe_files()

    assert result["success"] is True
    assert result["staged_files"] == ["README.md", "backend/app/services/git_service.py"]
    assert result["excluded_files"] == ["backend/.env", "backend/app/data/local.json"]
