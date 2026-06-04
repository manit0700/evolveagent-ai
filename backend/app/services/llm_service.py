from __future__ import annotations

from app.services.llm_router import llm_router


def call_llm(system_prompt: str, user_prompt: str) -> str:
    return llm_router.generate("general", system_prompt, user_prompt).output
