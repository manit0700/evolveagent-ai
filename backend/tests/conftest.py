import pytest

from app.config import settings


@pytest.fixture(autouse=True)
def force_mock_llm_mode(monkeypatch):
    monkeypatch.setattr(settings, "llm_mode", "mock")
    monkeypatch.setattr(settings, "openai_api_key", None)
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    monkeypatch.setattr(settings, "gemini_api_key", None)
    monkeypatch.setattr(settings, "mistral_api_key", None)
    monkeypatch.setattr(settings, "ollama_enabled", False)
    monkeypatch.setattr(settings, "ollama_base_url", "http://127.0.0.1:11434")
    monkeypatch.setattr(settings, "ollama_default_model", "llama3.1")
    monkeypatch.setattr(settings, "image_mode", "mock")
    monkeypatch.setattr(settings, "image_provider", "mock_image")
    monkeypatch.setattr(settings, "openai_image_model", "gpt-image-1.5")
