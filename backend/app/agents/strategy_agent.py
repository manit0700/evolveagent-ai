from app.agents.base_agent import BaseAgent


class StrategyAgent(BaseAgent):
    name = "Strategy Agent"
    system_prompt = (
        "You are the Strategy Agent. Your job is to recommend practical next steps and the best approach based on the task."
    )
