from fastapi.testclient import TestClient

from app.main import app
from app.services.master_agent_service import MasterAgentService
from app.services.storage_service import StorageService

client = TestClient(app)


def test_capabilities_lists_all_domains():
    caps = client.get("/api/master-agent/capabilities").json()
    assert caps["capability_count"] >= 10
    domains = {c["domain"] for c in caps["capabilities"]}
    for expected in ("Coding & Review", "MCP Tools & Integrations", "Compliance & Legal"):
        assert expected in domains
    assert "not AGI" in caps["disclaimer"]


def test_route_classifies_and_answers():
    body = {"text": "Review this Python function and suggest a refactor."}
    result = client.post("/api/master-agent/route", json=body).json()
    assert result["intent"]["primary_domain"] == "Coding & Review"
    assert isinstance(result["answer"], str)
    assert result["answered"] is True
    assert any(s["label"] == "Coding & Review" for s in result["sources"])
    assert "run_id" in result
    assert result["master_priority"] is True
    assert result["selected_task_type"] == "code_review"
    assert result["intent"]["selected_task_type"] == "code_review"


def test_route_flags_risky_action_for_approval():
    body = {"text": "Send an email to the whole team and post to slack.", "execute": True}
    result = client.post("/api/master-agent/route", json=body).json()
    assert result["requires_approval"] is True
    assert result["blocked_execution"] is True
    assert result["approval_reasons"]
    assert any("Approve" in f for f in result["followups"])


def test_route_reports_mcp_key_readiness_boolean_only():
    body = {"text": "Open a GitHub pull request for my repo."}
    result = client.post("/api/master-agent/route", json=body).json()
    assert isinstance(result["mcp_suggestions"], list)
    for suggestion in result["mcp_suggestions"]:
        for key in suggestion.get("required_keys", []):
            assert set(key.keys()) == {"key_name", "is_set"}
            assert isinstance(key["is_set"], bool)  # boolean only — never a secret value


def test_summary_and_analytics():
    client.post("/api/master-agent/route", json={"text": "Plan my week and set reminders."})
    summary = client.get("/api/master-agent/summary").json()
    for key in ("total_routes", "approvals_required", "by_domain", "capability_count"):
        assert key in summary
    analytics = client.get("/api/analytics").json()
    assert "master_agent_runs" in analytics


def test_route_is_governance_logged():
    before = client.get("/api/governance").json()["total_events"]
    client.post("/api/master-agent/route", json={"text": "Summarize the compliance policy."})
    after = client.get("/api/governance").json()
    assert after["total_events"] > before
    actions = {event.get("action_type") for event in after["recent_events"]}
    assert any(a and a.startswith("master_route") for a in actions)


def test_existing_endpoints_still_work():
    response = client.post("/api/run", json={"user_input": "Explain how EvolveAgent AI works."})
    assert response.status_code == 200
    assert isinstance(response.json().get("final_output"), str)
    assert client.get("/api/os2/dashboard").status_code == 200
    assert client.get("/api/data-export/summary").status_code == 200


def test_master_agent_passes_selected_task_type_to_run_pipeline(tmp_path):
    seen = {}

    class DummyGovernance:
        def log_event(self, event):
            pass

    class DummyMcp:
        def suggest(self, text):
            return {"suggestions": []}

    class DummyResponse:
        final_output = "ok"
        agents_used = ["Master Orchestrator"]

    def run_fn(request):
        seen["task_type"] = request.task_type
        seen["workspace_id"] = request.workspace_id
        return DummyResponse()

    service = MasterAgentService(StorageService(tmp_path), DummyGovernance(), DummyMcp(), run_fn)
    result = service.route("Review this Python function and fix the bug.", workspace_id="w1")

    assert seen == {"task_type": "code_review", "workspace_id": "w1"}
    assert result["master_priority"] is True
    assert result["intent"]["selected_task_type"] == "code_review"


def test_master_agent_fallback_uses_research_task_type(tmp_path):
    seen = {}

    class DummyGovernance:
        def log_event(self, event):
            pass

    class DummyMcp:
        def suggest(self, text):
            return {"suggestions": []}

    class DummyResponse:
        final_output = "ok"
        agents_used = ["Master Orchestrator"]

    def run_fn(request):
        seen["task_type"] = request.task_type
        return DummyResponse()

    service = MasterAgentService(StorageService(tmp_path), DummyGovernance(), DummyMcp(), run_fn)
    result = service.route("zxqw")

    assert result["fallback_used"] is True
    assert result["intent"]["primary_domain"] == "Research & Retrieval"
    assert result["intent"]["selected_task_type"] == "research"
    assert seen["task_type"] == "research"
