from app.config import settings
from app.services.llm_router import llm_router


def test_real_mode_openai_failure_falls_back_to_mock(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "openai_api_key", None)
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "gemini_api_key", None)
    monkeypatch.setattr(settings, "mistral_api_key", None)

    result = llm_router.generate_for_provider(
        "openai",
        settings.openai_reasoning_model,
        "You are a test agent.",
        "Return a short test response.",
    )

    assert result.provider == "mock"
    assert result.model == "mock-agent-model"
    assert result.fallback_used is True
    assert result.success is True


def test_real_mode_provider_status_with_openai_key(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "gemini_api_key", None)
    monkeypatch.setattr(settings, "mistral_api_key", None)
    monkeypatch.setattr(settings, "default_provider", "openai")

    status = llm_router.status()

    assert status.llm_mode == "real"
    assert status.openai_configured is True
    assert status.default_provider == "openai"
    assert status.available_providers == ["openai", "mock"]


def test_real_mode_provider_status_lists_configured_consensus_providers(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_api_key", "test-anthropic-key")
    monkeypatch.setattr(settings, "gemini_api_key", "test-gemini-key")
    monkeypatch.setattr(settings, "mistral_api_key", "test-mistral-key")
    monkeypatch.setattr(settings, "default_provider", "openai")

    status = llm_router.status()

    assert status.openai_configured is True
    assert status.anthropic_configured is True
    assert status.gemini_configured is True
    assert status.mistral_configured is True
    assert status.available_providers == ["openai", "anthropic", "gemini", "mistral", "mock"]


def test_consensus_routes_use_available_real_providers(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_api_key", "test-anthropic-key")
    monkeypatch.setattr(settings, "gemini_api_key", None)
    monkeypatch.setattr(settings, "mistral_api_key", None)
    monkeypatch.setattr(settings, "openai_text_model", "gpt-4o-mini")
    monkeypatch.setattr(settings, "anthropic_model", "claude-3-5-sonnet-latest")

    routes = llm_router.consensus_routes()

    assert [(route.provider, route.model) for route in routes] == [
        ("openai", "gpt-4o-mini"),
        ("anthropic", "claude-3-5-sonnet-latest"),
    ]


def test_consensus_routes_add_mock_comparison_when_only_one_real_provider(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "gemini_api_key", None)
    monkeypatch.setattr(settings, "mistral_api_key", None)

    routes = llm_router.consensus_routes()

    assert [route.provider for route in routes] == ["openai", "mock"]


def test_mock_consensus_keeps_three_demo_candidates(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "mock")

    routes = llm_router.consensus_routes()

    assert [route.provider for route in routes] == ["openai", "anthropic", "gemini"]


def test_v13_routes_text_agents_to_openai_only(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "anthropic_api_key", "test-anthropic-key")
    monkeypatch.setattr(settings, "gemini_api_key", "test-gemini-key")
    monkeypatch.setattr(settings, "mistral_api_key", "test-mistral-key")
    monkeypatch.setattr(settings, "default_provider", "openai")
    monkeypatch.setattr(settings, "openai_text_model", "gpt-4o-mini")

    for agent_name in ["Research Agent", "Risk Agent", "Writing Agent", "Judge Agent"]:
        route = llm_router.route_for_agent(agent_name)
        assert route.provider == "openai"
        assert route.model == "gpt-4o-mini"
