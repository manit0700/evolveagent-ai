import os

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_from_template(slug: str) -> dict:
    response = client.post("/api/mcp/connectors", json={"slug": slug})
    assert response.status_code == 200
    return response.json()


def test_default_templates_load():
    body = client.get("/api/mcp/templates").json()
    slugs = {t["slug"] for t in body["templates"]}
    for expected in ("filesystem", "git", "github", "linear", "context7", "playwright", "slack", "notion", "desktop-commander"):
        assert expected in slugs
    # Desktop Commander ships disabled-by-default.
    desktop = next(t for t in body["templates"] if t["slug"] == "desktop-commander")
    assert desktop["mode"] == "disabled"
    assert desktop["enabled"] is False


def test_create_and_list_connector():
    connector = _create_from_template("github")
    assert connector["connector_id"]
    assert connector["slug"] == "github"
    assert connector["risk_level"] == "medium"
    listed = client.get("/api/mcp/connectors").json()
    assert any(c["connector_id"] == connector["connector_id"] for c in listed["connectors"])


def test_enable_and_disable_connector():
    connector = _create_from_template("context7")  # low risk, read_only
    enabled = client.post(f"/api/mcp/connectors/{connector['connector_id']}/enable").json()
    assert enabled["enabled"] is True
    disabled = client.post(f"/api/mcp/connectors/{connector['connector_id']}/disable").json()
    assert disabled["enabled"] is False
    assert disabled["status"] == "disabled"


def test_status_check_does_not_expose_env_values(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "super-secret-value-1234567890")
    connector = _create_from_template("github")
    result = client.post(f"/api/mcp/connectors/{connector['connector_id']}/check").json()
    assert result["check_type"] == "dry"
    # Only booleans are returned for env keys.
    assert result["env_keys_status"] == {"GITHUB_TOKEN": True}
    assert "super-secret-value-1234567890" not in str(result)
    # The connector record itself never carries the secret value.
    fetched = client.get(f"/api/mcp/connectors/{connector['connector_id']}").json()
    assert "super-secret-value-1234567890" not in str(fetched)
    assert fetched.get("env_keys_status") == {"GITHUB_TOKEN": True}
    assert "env" not in fetched


def test_status_check_reports_missing_keys_without_values(monkeypatch):
    monkeypatch.delenv("NOTION_API_KEY", raising=False)
    connector = _create_from_template("notion")
    result = client.post(f"/api/mcp/connectors/{connector['connector_id']}/check").json()
    assert result["env_keys_status"] == {"NOTION_API_KEY": False}
    assert result["all_required_keys_set"] is False
    assert result["status"] == "not_configured"


def test_plan_read_only_action_allowed():
    connector = _create_from_template("context7")
    client.post(f"/api/mcp/connectors/{connector['connector_id']}/enable")
    plan = client.post(
        f"/api/mcp/connectors/{connector['connector_id']}/plan-action",
        json={"action_name": "fetch_library_docs", "payload": {}},
    ).json()
    assert plan["planned"] is True
    assert plan["allowed"] is True
    assert plan["requires_approval"] is False  # low-risk read_only
    assert plan["governance_event_id"]


def test_plan_write_action_requires_approval():
    connector = _create_from_template("github")  # approval_required
    plan = client.post(
        f"/api/mcp/connectors/{connector['connector_id']}/plan-action",
        json={"action_name": "draft_pr_comment", "payload": {}},
    ).json()
    assert plan["planned"] is True
    assert plan["requires_approval"] is True
    assert any("approval" in step.lower() for step in plan["plan"])


def test_blocked_action_is_blocked():
    connector = _create_from_template("github")
    plan = client.post(
        f"/api/mcp/connectors/{connector['connector_id']}/plan-action",
        json={"action_name": "delete repo", "payload": {}},
    ).json()
    assert plan["planned"] is False
    assert plan["allowed"] is False
    assert plan["blocked_reason"]


def test_desktop_commander_disabled_by_default_cannot_enable_or_plan():
    connector = _create_from_template("desktop-commander")
    assert connector["mode"] == "disabled"
    assert connector["enabled"] is False
    # Cannot enable a disabled-mode connector.
    enable = client.post(f"/api/mcp/connectors/{connector['connector_id']}/enable")
    assert enable.status_code == 409
    # Cannot plan an action either.
    plan = client.post(
        f"/api/mcp/connectors/{connector['connector_id']}/plan-action",
        json={"action_name": "plan_desktop_action"},
    ).json()
    assert plan["planned"] is False
    assert plan["allowed"] is False


def test_high_risk_connector_not_auto_enabled_on_create():
    # Filesystem is high risk; even if enabled=true is requested, it is not auto-enabled.
    connector = client.post("/api/mcp/connectors", json={"slug": "filesystem", "enabled": True}).json()
    assert connector["risk_level"] == "high"
    assert connector["enabled"] is False


def test_governance_event_for_creation_and_planning():
    before = client.get("/api/governance").json()["total_events"]
    connector = _create_from_template("linear")
    client.post(
        f"/api/mcp/connectors/{connector['connector_id']}/plan-action",
        json={"action_name": "list_issues"},
    )
    after = client.get("/api/governance").json()
    assert after["total_events"] > before
    actions = {event.get("action_type") for event in after["recent_events"]}
    assert "mcp_connector_created" in actions or "mcp_connector_action_requires_approval" in actions or "mcp_connector_action_planned" in actions


def test_connector_events_recorded():
    connector = _create_from_template("git")
    events = client.get(f"/api/mcp/events?connector_id={connector['connector_id']}").json()
    assert events["count"] >= 1
    assert any(e["event_type"] == "created" for e in events["events"])


def test_mcp_summary():
    _create_from_template("slack")
    summary = client.get("/api/mcp/summary").json()
    for key in (
        "total_connectors",
        "enabled_connectors",
        "available_connectors",
        "high_risk_connectors",
        "approval_required_connectors",
        "read_only_connectors",
        "recent_events",
        "safety_summary",
    ):
        assert key in summary
    safety = summary["safety_summary"]
    assert safety["secrets_exposed"] is False
    assert safety["unrestricted_shell_allowed"] is False
    assert safety["external_send_requires_approval"] is True


def test_master_agent_classifies_mcp_query():
    response = client.post("/api/run", json={"user_input": "Which MCPs should I enable to connect GitHub?"})
    assert response.status_code == 200
    body = response.json()
    assert body.get("task_type") == "mcp_connector_management"


def test_analytics_includes_mcp_fields():
    _create_from_template("github")
    analytics = client.get("/api/analytics").json()
    for key in ("mcp_total_connectors", "mcp_enabled_connectors", "mcp_actions_planned", "mcp_actions_blocked"):
        assert key in analytics


def test_existing_endpoints_still_work():
    response = client.post("/api/run", json={"user_input": "Explain how EvolveAgent AI works."})
    assert response.status_code == 200
    assert isinstance(response.json().get("final_output"), str)
    assert client.get("/api/governance").status_code == 200
    assert client.get("/api/operating-layer/dashboard").status_code == 200
