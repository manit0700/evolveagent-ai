from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_org() -> dict:
    response = client.post("/api/organization-os/organizations", json={"name": "Test Org"})
    assert response.status_code == 200
    return response.json()


def test_organization_create_list_get():
    org = _create_org()
    assert org["organization_id"]
    assert org["is_local_record"] is True
    listed = client.get("/api/organization-os/organizations").json()
    assert any(o["organization_id"] == org["organization_id"] for o in listed["organizations"])
    fetched = client.get(f"/api/organization-os/organizations/{org['organization_id']}").json()
    assert fetched["organization_id"] == org["organization_id"]
    assert client.get("/api/organization-os/organizations/missing").status_code == 404


def test_member_create_and_update():
    org = _create_org()
    member = client.post(
        "/api/organization-os/members",
        json={"organization_id": org["organization_id"], "display_name": "Alice", "role": "admin"},
    ).json()
    assert member["member_id"]
    assert member["role"] == "admin"
    assert "manage_members" in member["permissions"]
    assert member["is_local_profile"] is True
    listed = client.get("/api/organization-os/members").json()
    assert any(m["member_id"] == member["member_id"] for m in listed["members"])
    updated = client.patch(f"/api/organization-os/members/{member['member_id']}", json={"role": "viewer"}).json()
    assert updated["role"] == "viewer"
    assert updated["permissions"] == ["view"]
    assert client.patch("/api/organization-os/members/missing", json={"role": "admin"}).status_code == 404


def test_role_create_and_list():
    role = client.post("/api/organization-os/roles", json={"name": "auditor", "permissions": ["view", "audit"]}).json()
    assert role["role_id"]
    assert role["built_in"] is False
    roles = client.get("/api/organization-os/roles").json()["roles"]
    # Built-in roles + the custom one are returned.
    names = {r.get("role") or r.get("name") for r in roles}
    assert "owner" in names
    assert "auditor" in names


def test_workspace_link():
    org = _create_org()
    link = client.post(
        "/api/organization-os/workspace-links",
        json={"organization_id": org["organization_id"], "workspace_id": "ws-1", "workspace_name": "Main"},
    ).json()
    assert link["link_id"]
    assert link["workspace_id"] == "ws-1"


def test_dashboard_works_and_no_auth():
    _create_org()
    body = client.get("/api/organization-os/dashboard").json()
    for key in ("organization_count", "member_count", "role_distribution", "workspace_link_count", "available_roles", "note"):
        assert key in body
    # Confirms this is local-only, not production auth.
    assert "no production authentication" in body["note"].lower()
    assert "owner" in body["available_roles"]


def test_activity_and_governance_written():
    before = client.get("/api/governance").json()["total_events"]
    _create_org()
    after = client.get("/api/governance").json()
    assert after["total_events"] > before
    actions = {event.get("action_type") for event in after["recent_events"]}
    assert "organization_created" in actions
    activity = client.get("/api/organization-os/activity").json()
    assert activity["count"] >= 1


def test_regression_existing_endpoints():
    response = client.post("/api/run", json={"user_input": "Explain how EvolveAgent AI works."})
    assert response.status_code == 200
    assert isinstance(response.json().get("final_output"), str)
    assert client.get("/api/simulation-world/dashboard").status_code == 200
    assert client.get("/api/innovation-lab/dashboard").status_code == 200
    # The pre-existing workspaces feature is untouched.
    assert client.get("/api/workspaces").status_code == 200
