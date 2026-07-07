"""linear routes, split out of routes.py (services + models imported from there)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from app.api.routes import (
    codex_worker_service,
    linear_link_service,
    linear_service,
    workspace_service,
    CodexWorkerError,
    LinearServiceError,
    linear_orchestration,
    linear_poll_worker,
)
from app.models.request_models import (
    LinearCommentRequest,
    LinearCursorVerifyRequest,
)

router = APIRouter()


@router.get("/linear/status")
def get_linear_status() -> dict:
    return linear_service.get_linear_config()


@router.get("/linear/issues")
def list_linear_issues(status: str | None = Query(default=None)) -> list[dict]:
    try:
        return linear_service.list_linear_issues(status_filter=status)
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/linear/issues/{issue_id}")
def get_linear_issue(issue_id: str) -> dict:
    try:
        issue = linear_service.get_linear_issue(issue_id)
        link = linear_link_service.get_link_by_issue(issue_id)
        return {"issue": issue, "link": link}
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/linear/issues/{issue_id}/sync")
def sync_linear_issue(
    issue_id: str,
    workspace_id: str | None = Query(default=None),
) -> dict:
    try:
        return linear_orchestration.sync_issue(issue_id, workspace_id=workspace_id)
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/linear/issues/{issue_id}/select")
def select_linear_issue(
    issue_id: str,
    workspace_id: str | None = Query(default=None),
) -> dict:
    try:
        return linear_orchestration.select_issue(issue_id, workspace_id=workspace_id)
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/linear/issues/{issue_id}/run")
def run_linear_issue(
    issue_id: str,
    workspace_id: str | None = Query(default=None),
) -> dict:
    try:
        return linear_orchestration.run_issue(issue_id, workspace_id=workspace_id)
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/linear/issues/{issue_id}/comment")
def comment_linear_issue(issue_id: str, request: LinearCommentRequest) -> dict:
    try:
        return linear_orchestration.add_comment(issue_id, request.body)
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/linear/issues/{issue_id}/cursor-handoff")
def get_linear_cursor_handoff(issue_id: str) -> dict:
    try:
        return linear_orchestration.get_cursor_handoff(issue_id)
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/linear/issues/{issue_id}/cursor-verify")
def verify_linear_cursor_work(issue_id: str, request: LinearCursorVerifyRequest | None = None) -> dict:
    payload = request or LinearCursorVerifyRequest()
    try:
        return linear_orchestration.verify_cursor_work(
            issue_id,
            completion_note=payload.completion_note,
            auto_commit=payload.auto_commit,
        )
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/linear/issues/{issue_id}/complete")
def complete_linear_issue(issue_id: str) -> dict:
    try:
        return linear_orchestration.complete_linear_issue(issue_id)
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/linear/links")
def list_linear_links(workspace_id: str | None = Query(default=None)) -> list[dict]:
    resolved = workspace_service.resolve_workspace_id(workspace_id) if workspace_id else None
    return linear_link_service.list_links(resolved)


@router.get("/linear/poll/status")
def get_linear_poll_status() -> dict:
    return linear_poll_worker.status()


@router.post("/linear/poll/run-once")
def run_linear_poll_once() -> dict:
    processed = linear_poll_worker.poll_once()
    return {"processed": processed, **linear_poll_worker.status()}


@router.post("/linear/issues/{issue_id}/codex-run")
def run_codex_for_linear_issue(issue_id: str) -> dict:
    try:
        return codex_worker_service.run_for_issue(issue_id)
    except CodexWorkerError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LinearServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
