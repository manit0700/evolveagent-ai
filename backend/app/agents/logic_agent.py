from app.agents.base_agent import BaseAgent


class LogicAgent(BaseAgent):
    name = "Logic Agent"
    system_prompt = (
        "You are the Logic Agent. Your job is to analyze the request logically, compare important points, "
        "identify structure, and produce a clear reasoning summary. Do not create the final answer."
    )
