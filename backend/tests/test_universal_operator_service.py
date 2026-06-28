from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_session(**overrides) -> dict:
    payload = {"label": overrides.get("label", "Test session"), "surface": overrides.get("surface", "cross_app")}
    response = client.post("/api/universal-operator/sessions", json=payload)
    assert response.status_code == 200
    return response.json()


def _create_workflow(steps, **overrides) -> dict:
    payload = {"goal": overrides.get("goal", "Do a cross-app task"), "steps": steps}
    response = client.post("/api/universal-operator/workflows", json=payload)
    assert response.status_code == 200
    return response.json()


def test_session_create():
    session = _create_session()
    assert session["session_id"]
    assert session["mock_mode"] is True
    listed = client.get("/api/universal-operator/sessions").json()
    assert any(s["session_id"] == session["session_id"] for s in listed["sessions"])


def test_workflow_create():
    workflow = _create_workflow(["Open the browser", "Draft a reply"])
    assert workflow["workflow_id"]
    assert workflow["status"] == "draft"
    listed = client.get("/api/universal-operator/workflows").json()
    assert any(w["workflow_id"] == workflow["workflow_id"] for w in listed["workflows"])


def test_workflow_plan_classifies_steps():
    workflow = _create_workflow(["Read the inbox", "Draft a summary", "Send the email", "Pay the invoice"])
    plan = client.post(f"/api/universal-operator/workflows/{workflow['workflow_id']}/plan").json()
    assert plan["mock_mode"] is True
    levels = {a["description"]: a["permission_level"] for a in plan["planned_actions"]}
    # Sensitive steps flagged for approval; safe steps planned.
    send = next(a for a in plan["planned_actions"] if a["permission_level"] == "send")
    pay = next(a for a in plan["planned_actions"] if a["permission_level"] == "pay")
    assert send["requires_approval"] is True and send["status"] == "needs_approval"
    assert pay["sensitive"] is True
    read = next(a for a in plan["planned_actions"] if a["permission_level"] == "read")
    assert read["status"] == "planned"
    assert plan["sensitive_action_count"] >= 2


def test_workflow_not_found():
    assert client.post("/api/universal-operator/workflows/missing/plan").status_code == 404


def test_sensitive_action_requires_approval_decision():
    workflow = _create_workflow(["Send the report"])
    plan = client.post(f"/api/universal-operator/workflows/{workflow['workflow_id']}/plan").json()
    action = plan["planned_actions"][0]
    assert action["requires_approval"] is True
    approved = client.post(f"/api/universal-operator/actions/{action['action_id']}/decision", json={"decision": "approve"}).json()
    # Approved is recorded as mock — never actually executed.
    assert approved["status"] == "approved_mock"
    rejected = client.post(f"/api/universal-operator/actions/{action['action_id']}/decision", json={"decision": "reject"}).json()
    assert rejected["status"] == "rejected"
    assert client.post("/api/universal-operator/actions/missing/decision", json={"decision": "approve"}).status_code == 404


def test_handoff_create_and_list():
    handoff = client.post(
        "/api/universal-operator/handoffs",
        json={"from_device": "laptop", "to_device": "phone", "summary": "Continue the draft"},
    ).json()
    assert handoff["handoff_id"]
    assert handoff["from_device"] == "laptop"
    assert handoff["mock_mode"] is True
    listed = client.get("/api/universal-operator/handoffs").json()
    assert any(h["handoff_id"] == handoff["handoff_id"] for h in listed["handoffs"])


def test_audit_record_written():
    workflow = _create_workflow(["Read something"])
    client.post(f"/api/universal-operator/workflows/{workflow['workflow_id']}/plan")
    audit = client.get("/api/universal-operator/audit").json()
    assert audit["count"] >= 1
    event_types = {entry["event_type"] for entry in audit["audit"]}
    assert event_types & {"session_created", "workflow_created", "action_planned"}


def test_dashboard_counts():
    body = client.get("/api/universal-operator/dashboard").json()
    for key in (
        "total_sessions",
        "total_workflows",
        "total_actions",
        "sensitive_actions",
        "actions_awaiting_approval",
        "total_handoffs",
        "permission_levels",
        "mock_mode",
    ):
        assert key in body
    assert body["mock_mode"] is True
    assert "external_share" in body["permission_levels"]


def test_governance_event_written():
    before = client.get("/api/governance").json()["total_events"]
    _create_session()
    after = client.get("/api/governance").json()
    assert after["total_events"] > before
    actions = {event.get("action_type") for event in after["recent_events"]}
    assert "universal_session_created" in actions


def test_regression_existing_endpoints():
    response = client.post("/api/run", json={"user_input": "Explain how EvolveAgent AI works."})
    assert response.status_code == 200
    assert isinstance(response.json().get("final_output"), str)
    assert client.get("/api/life-os/dashboard").status_code == 200
    assert client.get("/api/avatar/dashboard").status_code == 200
    assert client.get("/api/device-operator/dashboard").status_code == 200
