from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_world() -> dict:
    response = client.post("/api/simulation-world/worlds", json={"name": "Test world"})
    assert response.status_code == 200
    return response.json()


def _create_scenario(**overrides) -> dict:
    payload = {
        "title": overrides.get("title", "Launch plan"),
        "scenario_type": overrides.get("scenario_type", "launch"),
        "description": overrides.get("description", "Launch a new feature."),
        "assumptions": overrides.get("assumptions", ["Two-week build", "Existing users"]),
    }
    response = client.post("/api/simulation-world/scenarios", json=payload)
    assert response.status_code == 200
    return response.json()


def test_world_create_and_list():
    world = _create_world()
    assert world["world_id"]
    listed = client.get("/api/simulation-world/worlds").json()
    assert any(w["world_id"] == world["world_id"] for w in listed["worlds"])


def test_persona_create_and_list():
    persona = client.post("/api/simulation-world/personas", json={"name": "Power user", "persona_type": "user", "goals": ["save time"]}).json()
    assert persona["persona_id"]
    listed = client.get("/api/simulation-world/personas").json()
    assert any(p["persona_id"] == persona["persona_id"] for p in listed["personas"])


def test_scenario_create_and_list():
    scenario = _create_scenario(title="Scenario A")
    assert scenario["scenario_id"]
    assert scenario["scenario_type"] == "launch"
    listed = client.get("/api/simulation-world/scenarios").json()
    assert any(s["scenario_id"] == scenario["scenario_id"] for s in listed["scenarios"])


def test_run_simulation():
    scenario = _create_scenario()
    outcome = client.post(f"/api/simulation-world/scenarios/{scenario['scenario_id']}/run").json()
    assert outcome["outcome_id"]
    assert 0 <= outcome["success_score"] <= 100
    assert outcome["likely_result"] in {"favorable", "uncertain", "challenged"}
    assert outcome["simulation_only"] is True
    assert "no real-world action" in outcome["note"].lower()
    assert client.post("/api/simulation-world/scenarios/missing/run").status_code == 404


def test_run_simulation_is_deterministic():
    scenario = _create_scenario(title="Determinism", assumptions=["a", "b"])
    first = client.post(f"/api/simulation-world/scenarios/{scenario['scenario_id']}/run").json()
    second = client.post(f"/api/simulation-world/scenarios/{scenario['scenario_id']}/run").json()
    assert first["success_score"] == second["success_score"]


def test_compare_scenarios():
    safe = _create_scenario(title="Safe", description="A calm internal improvement.", assumptions=["x", "y", "z"])
    risky = _create_scenario(title="Risky", description="Urgent production payment security launch with legal deadline.", assumptions=[])
    comparison = client.post("/api/simulation-world/compare", json={"scenario_ids": [safe["scenario_id"], risky["scenario_id"]]}).json()
    assert comparison["compared_count"] == 2
    assert comparison["ranking"][0]["score"] >= comparison["ranking"][1]["score"]
    assert comparison["recommended"]


def test_report_generation():
    scenario = _create_scenario()
    client.post(f"/api/simulation-world/scenarios/{scenario['scenario_id']}/run")
    report = client.post("/api/simulation-world/reports", json={"title": "Sim report"}).json()
    assert report["report_id"]
    assert "average_score" in report
    listed = client.get("/api/simulation-world/reports").json()
    assert any(r["report_id"] == report["report_id"] for r in listed["reports"])


def test_dashboard_works():
    body = client.get("/api/simulation-world/dashboard").json()
    for key in ("world_count", "persona_count", "scenario_count", "outcome_count", "report_count", "note"):
        assert key in body
    assert "no real-world actions" in body["note"].lower()


def test_governance_and_regression():
    before = client.get("/api/governance").json()["total_events"]
    _create_world()
    after = client.get("/api/governance").json()
    assert after["total_events"] > before
    response = client.post("/api/run", json={"user_input": "Explain how EvolveAgent AI works."})
    assert response.status_code == 200
    # v20 business simulator still works (distinct from this simulation world).
    assert client.get("/api/business-simulator/dashboard").status_code == 200
    assert client.get("/api/innovation-lab/dashboard").status_code == 200
