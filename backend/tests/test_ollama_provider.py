from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services.llm_router import LLMRouter, RouteChoice
from app.services.providers.ollama_provider import OllamaProvider

client = TestClient(app)


class _FakeResponse:
    def __init__(self, data: dict, status_code: int = 200):
        self._data = data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("HTTP error")

    def json(self):
        return self._data


class _FakeOllamaHTTP:
    def __init__(self):
        self.calls: list[dict] = []

    def get(self, url: str, timeout: float):
        self.calls.append({"method": "GET", "url": url, "timeout": timeout})
        return _FakeResponse({"models": [{"name": "llama3.1"}, {"name": "codellama"}]})

    def post(self, url: str, json: dict, timeout: float):
        self.calls.append({"method": "POST", "url": url, "json": json, "timeout": timeout})
        return _FakeResponse({"message": {"content": "local provider ready"}})


def test_ollama_status_is_disabled_by_default_without_http_call(monkeypatch):
    http = _FakeOllamaHTTP()
    monkeypatch.setattr(settings, "ollama_enabled", False)
    provider = OllamaProvider(http_client=http)

    status = provider.status()

    assert status["enabled"] is False
    assert status["configured"] is False
    assert status["reachable"] is False
    assert status["models"] == []
    assert http.calls == []


def test_ollama_status_lists_models_when_enabled(monkeypatch):
    http = _FakeOllamaHTTP()
    monkeypatch.setattr(settings, "ollama_enabled", True)
    monkeypatch.setattr(settings, "ollama_base_url", "http://127.0.0.1:11434")
    provider = OllamaProvider(http_client=http)

    status = provider.status()

    assert status["enabled"] is True
    assert status["configured"] is True
    assert status["reachable"] is True
    assert status["models"] == ["llama3.1", "codellama"]
    assert http.calls[0]["url"] == "http://127.0.0.1:11434/api/tags"


def test_ollama_generate_uses_local_chat_api(monkeypatch):
    http = _FakeOllamaHTTP()
    monkeypatch.setattr(settings, "ollama_enabled", True)
    monkeypatch.setattr(settings, "ollama_base_url", "http://127.0.0.1:11434")
    monkeypatch.setattr(settings, "ollama_default_model", "llama3.1")
    provider = OllamaProvider(http_client=http)

    output = provider.generate("system", "user")

    post_call = next(call for call in http.calls if call["method"] == "POST")
    assert output == "local provider ready"
    assert post_call["url"] == "http://127.0.0.1:11434/api/chat"
    assert post_call["json"]["model"] == "llama3.1"
    assert post_call["json"]["stream"] is False


def test_router_can_select_ollama_as_default_provider(monkeypatch):
    router = LLMRouter()
    router.providers["ollama"] = OllamaProvider(http_client=_FakeOllamaHTTP())
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "default_provider", "ollama")
    monkeypatch.setattr(settings, "ollama_enabled", True)
    monkeypatch.setattr(settings, "ollama_default_model", "llama3.1")

    result = router.generate("Any Agent", "system", "user")

    assert result.provider == "ollama"
    assert result.model == "llama3.1"
    assert result.output == "local provider ready"
    assert result.fallback_used is False


def test_router_falls_back_when_ollama_is_disabled(monkeypatch):
    router = LLMRouter()
    monkeypatch.setattr(settings, "llm_mode", "real")
    monkeypatch.setattr(settings, "default_provider", "ollama")
    monkeypatch.setattr(settings, "ollama_enabled", False)

    result = router.generate_with_route(RouteChoice("ollama", "llama3.1"), "system", "user")

    assert result.provider == "mock"
    assert result.fallback_used is True


def test_ollama_status_endpoint_is_secret_safe(monkeypatch):
    monkeypatch.setattr(settings, "ollama_enabled", False)

    response = client.get("/api/providers/ollama/status")
    body = response.json()

    assert response.status_code == 200
    assert body["provider"] == "ollama"
    assert "api_key" not in str(body).lower()
    assert "secret" not in str(body).lower()
