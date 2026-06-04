from app.agents.base_agent import BaseAgent


class RiskAgent(BaseAgent):
    name = "Risk Agent"
    system_prompt = (
        "You are the Risk Agent. Your job is to find weaknesses, assumptions, missing information, "
        "and possible risks. Be honest and specific."
    )
