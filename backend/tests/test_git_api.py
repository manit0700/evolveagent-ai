from __future__ import annotations

from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.api import routes
from app.config import settings
from app.main import app

client = TestClient(app)


def test_git_status_endpoint(monkeypatch):
    git = MagicMock()
    git.git_status.return_value = {"clean": False, "output": " M README.md", "success": True}
    git.current_branch.return_value = "linear/evo-171"
    git.list_changed_files.return_value = ["README.md"]
    git.diff_summary.return_value = "README.md | 2 +"
    monkeypatch.setattr(routes, "git_service", git)

    response = client.get("/api/git/status")
    body = response.json()

    assert response.status_code == 200
    assert body["branch"] == "linear/evo-171"
    assert body["changed_files"] == ["README.md"]
    assert body["clean"] is False
    assert body["diff_summary"] == "README.md | 2 +"


def test_git_branch_endpoint_uses_service(monkeypatch):
    git = MagicMock()
    git.create_branch.return_value = {"success": True, "branch": "linear-evo-171", "message": "created"}
    monkeypatch.setattr(routes, "git_service", git)

    response = client.post("/api/git/branch", json={"branch_name": "Linear EVO 171"})

    assert response.status_code == 200
    assert response.json()["branch"] == "linear-evo-171"
    git.create_branch.assert_called_once_with("Linear EVO 171")


def test_git_stage_safe_endpoint_uses_safe_staging(monkeypatch):
    git = MagicMock()
    git.add_safe_files.return_value = {
        "success": True,
        "staged_files": ["README.md"],
        "excluded_files": ["backend/.env"],
        "message": "Staged 1 safe file(s)",
    }
    monkeypatch.setattr(routes, "git_service", git)

    response = client.post("/api/git/stage-safe")
    body = response.json()

    assert response.status_code == 200
    assert body["staged_files"] == ["README.md"]
    assert body["excluded_files"] == ["backend/.env"]
    git.add_safe_files.assert_called_once()


def test_git_commit_endpoint_uses_service(monkeypatch):
    git = MagicMock()
    git.commit.return_value = {"success": True, "commit_hash": "abc1234", "message": "committed"}
    monkeypatch.setattr(routes, "git_service", git)

    response = client.post("/api/git/commit", json={"message": "Linear EVO-171: test commit"})

    assert response.status_code == 200
    assert response.json()["commit_hash"] == "abc1234"
    git.commit.assert_called_once_with("Linear EVO-171: test commit")


def test_git_push_endpoint_respects_auto_push_disabled(monkeypatch):
    monkeypatch.setattr(settings, "auto_git_push", False)
    git = MagicMock()
    git.push.return_value = {
        "success": False,
        "skipped": True,
        "message": "Push skipped because AUTO_GIT_PUSH=false",
    }
    monkeypatch.setattr(routes, "git_service", git)

    response = client.post("/api/git/push", json={})
    body = response.json()

    assert response.status_code == 200
    assert body["skipped"] is True
    assert "AUTO_GIT_PUSH=false" in body["message"]
    git.push.assert_called_once_with(remote=None, branch=None)
