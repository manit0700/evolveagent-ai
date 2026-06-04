from app.services.providers.base import LLMProvider


class MockProvider(LLMProvider):
    provider_name = "mock"

    def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        return mock_response(system_prompt, user_prompt)


def mock_response(system_prompt: str, user_prompt: str) -> str:
    lower_prompt = f"{system_prompt} {user_prompt}".lower()
    task_preview = user_prompt.strip().replace("\n", " ")[:220]

    if "research agent" in lower_prompt:
        return (
            f"Context summary: The request focuses on '{task_preview}'. Key context includes the user's goal, "
            "the likely audience, constraints, and the information needed before making a final recommendation."
        )
    if "logic agent" in lower_prompt:
        return (
            "Structured analysis: The task should be broken into objective, inputs, constraints, risks, and next actions. "
            "The strongest response should compare options, state assumptions, and avoid unsupported claims."
        )
    if "risk agent" in lower_prompt:
        return (
            "Risk review: Important gaps may include missing source details, unclear success criteria, and domain-specific "
            "limits. Any finance, pharmacy, medical, or legal output should be treated as decision support only."
        )
    if "strategy agent" in lower_prompt:
        return (
            "Recommended approach: Start with the highest-impact clarification, produce a practical plan, prioritize quick "
            "wins, and leave advanced or uncertain items as follow-up work."
        )
    if "writing agent" in lower_prompt:
        return (
            "## Final Answer\n\n"
            "Here is a clear, practical response built from the specialist agents:\n\n"
            "1. Define the goal and constraints.\n"
            "2. Use the available context to identify the strongest path forward.\n"
            "3. Address risks and assumptions explicitly.\n"
            "4. Follow a prioritized action plan with concrete next steps.\n\n"
            "Human review is required before using this output for important financial, medical, legal, or professional decisions."
        )
    if "evolution agent" in lower_prompt:
        return (
            "Add a task-specific specialist agent for recurring workflows. Improve prompts by asking agents to state assumptions. "
            "If judge scores fall below 70, rerun risk and writing passes before returning the final answer."
        )
    return f"Mock response generated for: {task_preview}"
