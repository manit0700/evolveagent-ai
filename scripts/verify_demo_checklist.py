#!/usr/bin/env python3
"""Verify FINAL_CHECKLIST.md flows via API (headless manual demo)."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

import httpx

BASE = "http://127.0.0.1:8000"
RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    client = httpx.Client(base_url=BASE, timeout=120.0)

    health = client.get("/health")
    check("Health endpoint", health.status_code == 200 and health.json().get("status") == "ok")

    providers = client.get("/api/providers/status")
    check("Provider status endpoint", providers.status_code == 200)
    pdata = providers.json()
    check("Mock provider available", "mock" in pdata.get("available_providers", []))

    workspaces = client.get("/api/workspaces")
    check("Workspace list", workspaces.status_code == 200)
    ws_list = workspaces.json()
    default_ws = ws_list[0] if ws_list else None
    if not default_ws:
        created = client.post("/api/workspaces", json={"name": "Default Demo", "description": "Demo workspace"})
        default_ws = created.json()
    ws_id = default_ws["workspace_id"]
    check("Default workspace exists", bool(ws_id))

    resume_ws = client.post(
        "/api/workspaces",
        json={"name": "Resume Projects", "description": "Prefer concise bullets"},
    )
    resume_id = resume_ws.json()["workspace_id"]
    mem = client.post(
        f"/api/workspaces/{resume_id}/memory",
        json={
            "type": "preference",
            "title": "Resume style",
            "content": "Prefer concise software engineering internship bullets",
            "importance": "high",
            "tags": ["resume"],
        },
    )
    check("Workspace memory add", mem.status_code == 200)

    run = client.post(
        "/api/run",
        json={
            "user_input": "Explain how EvolveAgent AI works.",
            "workspace_id": ws_id,
            "task_type": "auto",
        },
    )
    run_data = run.json()
    check("Text prompt /api/run", run.status_code == 200 and bool(run_data.get("final_output")))
    check("Workflow metadata", bool(run_data.get("task_type")) and bool(run_data.get("agents_used")))
    check("Workspace id on run", run_data.get("workspace_id") == ws_id)

    deep = client.post(
        "/api/run",
        json={
            "user_input": "Compare the best plan for improving this project demo.",
            "workspace_id": ws_id,
            "task_type": "auto",
            "deep_mode": True,
        },
    )
    deep_data = deep.json()
    check(
        "Deep Mode consensus fields",
        deep.status_code == 200
        and bool(deep_data.get("consensus_candidates"))
        and bool(deep_data.get("consensus_winner")),
    )

    auto = client.post(
        "/api/run",
        json={"user_input": "Add dark mode to this app.", "workspace_id": ws_id, "task_type": "auto"},
    )
    auto_data = auto.json()
    check(
        "App automation approval plan",
        auto.status_code == 200
        and auto_data.get("task_type") == "app_automation"
        and bool(auto_data.get("automation_plan")),
    )

    image = client.post(
        "/api/run",
        json={
            "user_input": "Generate an image prompt for a futuristic AI assistant.",
            "workspace_id": ws_id,
            "task_type": "auto",
        },
    )
    image_data = image.json()
    check(
        "Mock image preview",
        image.status_code == 200
        and image_data.get("task_type") == "image_generation"
        and bool(image_data.get("image_result")),
    )

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as tmp:
        tmp.write("EvolveAgent AI demo document for summary testing.\n")
        tmp_path = tmp.name
    with open(tmp_path, "rb") as fh:
        upload = client.post("/api/files/upload", files={"files": ("demo.txt", fh, "text/plain")})
    upload_data = upload.json()
    file_id = upload_data["files"][0]["file_id"] if upload.status_code == 200 else None
    check("File upload", upload.status_code == 200 and bool(file_id))
    if file_id:
        file_run = client.post(
            "/api/run",
            json={
                "user_input": "Summarize this uploaded document.",
                "file_ids": [file_id],
                "workspace_id": ws_id,
                "task_type": "auto",
            },
        )
        check("File-aware run", file_run.status_code == 200 and file_run.json().get("file_context_used") is True)

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as rec:
        rec.write("mock transcript placeholder")
        rec_path = rec.name
    with open(rec_path, "rb") as fh:
        rec_upload = client.post(
            "/api/recordings/upload",
            files={"files": ("demo.wav", fh, "audio/wav")},
        )
    rec_data = rec_upload.json()
    rec_id = rec_data["recordings"][0]["recording_id"] if rec_upload.status_code == 200 else None
    check("Recording upload", rec_upload.status_code == 200 and bool(rec_id))
    if rec_id:
        rec_run = client.post(
            "/api/run",
            json={
                "user_input": "Summarize this recording and list action items.",
                "recording_ids": [rec_id],
                "workspace_id": ws_id,
                "task_type": "auto",
            },
        )
        check(
            "Recording-aware run",
            rec_run.status_code == 200 and rec_run.json().get("recording_context_used") is True,
        )

    goal = client.post("/api/goals", json={"prompt": "Build an AI resume analyzer app", "workspace_id": ws_id})
    goal_data = goal.json()
    goal_id = goal_data.get("goal", {}).get("goal_id")
    check("Mission Control goal create", goal.status_code == 200 and bool(goal_id))

    goal_plan = client.post(
        "/api/run",
        json={"user_input": "Break this goal into tasks.", "workspace_id": ws_id, "task_type": "auto"},
    )
    check("Goal planning via run", goal_plan.status_code == 200 and goal_plan.json().get("task_type") == "goal_planning")

    templates = client.get("/api/agents/templates")
    check("Custom agent templates", templates.status_code == 200 and len(templates.json()) >= 1)
    if templates.status_code == 200:
        tpl = templates.json()[0]
        custom = client.post(
            "/api/agents/custom",
            json={"template_name": tpl["name"], "workspace_id": ws_id},
        )
        check("Custom agent from template", custom.status_code == 200 and bool(custom.json().get("agent_id")))

    feedback = client.post(
        "/api/feedback",
        json={
            "run_id": run_data.get("run_id"),
            "session_id": run_data.get("session_id"),
            "message_id": run_data.get("message_id"),
            "rating": "helpful",
            "workspace_id": ws_id,
        },
    )
    check("Feedback save", feedback.status_code == 200)

    analytics = client.get("/api/analytics", params={"workspace_id": ws_id})
    check("Analytics panel data", analytics.status_code == 200 and analytics.json().get("total_runs", 0) >= 1)

    learning = client.get("/api/learning/report", params={"workspace_id": ws_id})
    check("Learning report", learning.status_code == 200)

    reject = client.post(
        "/api/automation/apply",
        json={"run_id": auto_data.get("run_id"), "approved": False},
    )
    check("Automation reject (no apply)", reject.status_code == 200)

    chats = client.get("/api/chats", params={"workspace_id": ws_id})
    check("Workspace-scoped chats", chats.status_code == 200)

    goals = client.get("/api/goals", params={"workspace_id": ws_id})
    check("Workspace-scoped goals", goals.status_code == 200)

    custom_agents = client.get("/api/agents/custom", params={"workspace_id": ws_id})
    check("Workspace-scoped custom agents", custom_agents.status_code == 200)

    passed = sum(1 for _, ok, _ in RESULTS if ok)
    total = len(RESULTS)
    print(f"\nSummary: {passed}/{total} checks passed")
    Path("/workspace/scripts/demo_checklist_results.json").write_text(
        json.dumps([{"name": n, "ok": ok, "detail": d} for n, ok, d in RESULTS], indent=2)
    )
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
