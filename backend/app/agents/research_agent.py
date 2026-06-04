from app.agents.base_agent import BaseAgent


class ResearchAgent(BaseAgent):
    name = "Research Agent"
    system_prompt = (
        "You are the Research Agent. Your job is to understand the user request, identify key context, "
        "and summarize important background information. Do not create the final answer. Focus only on research and context."
    )
