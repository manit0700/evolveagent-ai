from __future__ import annotations

from typing import Any

import httpx

from app.config import settings
from app.services.providers.base import LLMProvider

_TIMEOUT_SECONDS = 30.0


class OllamaProvider(LLMProvider):
    provider_name = "ollama"

    def __init__(self, http_client: Any | None = None):
        self.http_client = http_client

    def _base_url(self) -> str:
        return str(settings.ollama_base_url or "").rstrip("/")

    def configured(self) -> bool:
        return bool(settings.ollama_enabled and self._base_url())

    def _post_json(self, path: str, payload: dict) -> dict:
        url = self._base_url() + path
        if self.http_client is not None:
            response = self.http_client.post(url, json=payload, timeout=_TIMEOUT_SECONDS)
        else:
            response = httpx.post(url, json=payload, timeout=_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else {}

    def _get_json(self, path: str, timeout: float = 2.5) -> dict:
        url = self._base_url() + path
        if self.http_client is not None:
            response = self.http_client.get(url, timeout=timeout)
        else:
            response = httpx.get(url, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        return data if isinstance(data, dict) else {}

    def list_models(self) -> list[str]:
        if not self.configured():
            return []
        data = self._get_json("/api/tags")
        return [
            str(item.get("name"))
            for item in data.get("models", [])
            if isinstance(item, dict) and item.get("name")
        ][:50]

    def status(self) -> dict:
        configured = self.configured()
        models: list[str] = []
        reachable = False
        note = "Set OLLAMA_ENABLED=true and start Ollama to enable local model routing."
        if configured:
            try:
                models = self.list_models()
                reachable = True
                note = "" if models else "Ollama is reachable but reports no installed models."
            except Exception:
                note = "Ollama is enabled but not reachable at the configured local URL."
        return {
            "provider": self.provider_name,
            "enabled": bool(settings.ollama_enabled),
            "configured": configured,
            "reachable": reachable,
            "base_url_configured": bool(settings.ollama_base_url),
            "default_model": settings.ollama_default_model,
            "models": models,
            "note": note,
        }

    def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        if not self.configured():
            raise RuntimeError("Ollama provider is not enabled or configured")

        active_model = model or settings.ollama_default_model
        data = self._post_json(
            "/api/chat",
            {
                "model": active_model,
                "stream": False,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        message = data.get("message") if isinstance(data.get("message"), dict) else {}
        content = message.get("content") or data.get("response") or ""
        if not content:
            raise RuntimeError("Ollama response did not include message content")
        return str(content)
