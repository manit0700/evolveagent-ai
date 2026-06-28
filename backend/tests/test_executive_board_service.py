from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _create_session(**overrides) -> dict:
    payload = {
        "title": overrides.get("title", "Should we launch the EU region?"),
        "decision": overrides.get("decision", "Launch in the EU next quarter."),
        "context": overrides.get("context", "Demand is rising in the EU."),
    }
    response = client.post("/api/executive-board/sessions", json=payload)
    assert response.status_code == 200
    return response.json()


def test_session_create_list_get_and_role_perspectives():
    session = _create_session()
    assert session["session_id"]
    assert session["status"] == "open"
    # Role-specific perspectives generated for all executive roles.
    roles = {p["role"] for p in session["perspectives"]}
    for expected in ("CEO", "CTO", "CFO", "COO", "Legal/Compliance", "Product", "Marketing", "Security"):
        assert expected in roles
    listed = client.get("/api/executive-board/sessions").json()
    assert any(s["session_id"] == session["session_id"] for s in listed["sessions"])
    fetched = client.get(f"/api/executive-board/sessions/{session['session_id']}").json()
    assert fetched["session_id"] == session["session_id"]
    assert client.get("/api/executive-board/sessions/missing").status_code == 404


def test_review_generated():
    session = _create_session()
    review = client.post(f"/api/executive-board/sessions/{session['session_id']}/review").json()
    for key in ("risks", "opportunities", "costs", "technical_concerns", "compliance_concerns"):
        assert key in review["review"]
    assert review["recommendation"]
    assert client.post("/api/executive-board/sessions/missing/review").status_code == 404
    # Recommendation persisted.
    recs = client.get("/api/executive-board/recommendations").json()
    assert any(r["session_id"] == session["session_id"] for r in recs["recommendations"])


def test_vote_stored():
    session = _create_session()
    vote = client.post(
        f"/api/executive-board/sessions/{session['session_id']}/vote",
        json={"role": "CFO", "vote": "approve", "rationale": "ROI positive"},
    ).json()
    assert vote["vote_id"]
    assert vote["role"] == "CFO"
    assert vote["vote"] == "approve"
    assert client.post("/api/executive-board/sessions/missing/vote", json={"role": "CEO", "vote": "approve"}).status_code == 404


def test_report_generated():
    session = _create_session()
    client.post(f"/api/executive-board/sessions/{session['session_id']}/vote", json={"role": "CEO", "vote": "approve"})
    client.post(f"/api/executive-board/sessions/{session['session_id']}/vote", json={"role": "CTO", "vote": "reject"})
    client.post(f"/api/executive-board/sessions/{session['session_id']}/review")
    report = client.post(f"/api/executive-board/sessions/{session['session_id']}/report").json()
    assert report["report_id"]
    assert "vote_tally" in report
    assert report["board_lean"] in {"approve", "reject", "split"}
    assert report["recommendation"]
    assert "does not execute" in report["note"].lower()
    listed = client.get("/api/executive-board/reports").json()
    assert any(r["report_id"] == report["report_id"] for r in listed["reports"])


def test_recommendations_returned():
    session = _create_session()
    client.post(f"/api/executive-board/sessions/{session['session_id']}/review")
    body = client.get("/api/executive-board/recommendations").json()
    assert isinstance(body["recommendations"], list)
    assert body["count"] >= 1


def test_dashboard_works():
    body = client.get("/api/executive-board/dashboard").json()
    for key in ("total_sessions", "reviewed_sessions", "total_votes", "total_reports", "executive_roles", "note"):
        assert key in body
    assert "Security" in body["executive_roles"]
    assert "does not execute" in body["note"].lower()


def test_governance_event_written():
    before = client.get("/api/governance").json()["total_events"]
    _create_session()
    after = client.get("/api/governance").json()
    assert after["total_events"] > before
    actions = {event.get("action_type") for event in after["recent_events"]}
    assert "executive_board_session_created" in actions


def test_regression_existing_endpoints():
    response = client.post("/api/run", json={"user_input": "Explain how EvolveAgent AI works."})
    assert response.status_code == 200
    assert isinstance(response.json().get("final_output"), str)
    assert client.get("/api/compliance/dashboard").status_code == 200
    assert client.get("/api/business-operator/dashboard").status_code == 200
    assert client.get("/api/team-manager/dashboard").status_code == 200
