from app.models.response_models import AgentEvaluation, AgentOutput, JudgeResult
from app.services.llm_router import llm_router


class JudgeAgent:
    name = "Judge Agent"
    system_prompt = (
        "You are the Judge Agent. Your job is to evaluate all agent outputs. Score the overall quality "
        "from 0 to 100 and provide strengths, weaknesses, and a recommendation."
    )

    def evaluate(self, agent_outputs: list[AgentOutput], final_output: str = "", avoid_provider: str | None = None) -> JudgeResult:
        route = llm_router.route_for_agent(self.name, avoid_provider=avoid_provider)
        per_agent_scores = [self.evaluate_agent_output(item) for item in agent_outputs]
        score = 75
        strengths: list[str] = []
        weaknesses: list[str] = []

        if len(agent_outputs) >= 4 and all(item.output.strip() for item in agent_outputs):
            score += 5
            strengths.append("All core specialist agents returned usable output.")
        else:
            weaknesses.append("One or more specialist outputs were missing or thin.")

        risk_output = next((item.output for item in agent_outputs if item.agent_name == "Risk Agent"), "")
        if risk_output.strip():
            score += 5
            strengths.append("The workflow includes explicit risk and assumption review.")
        else:
            weaknesses.append("Risk review should be strengthened.")

        strategy_output = next((item.output for item in agent_outputs if item.agent_name == "Strategy Agent"), "")
        if strategy_output.strip():
            score += 5
            strengths.append("The workflow includes practical next steps.")

        if "final answer" in final_output.lower() or "##" in final_output:
            score += 5
            strengths.append("The final answer is formatted for user review.")
        else:
            weaknesses.append("The final answer could use clearer sectioning.")

        score = min(score, 95)
        if not weaknesses:
            weaknesses.append("Future versions should add deeper task-specific specialists.")
        strongest_agent = max(per_agent_scores, key=lambda item: item.usefulness_score + item.clarity_score).agent_name if per_agent_scores else None
        weakest_agent = min(per_agent_scores, key=lambda item: item.usefulness_score + item.clarity_score).agent_name if per_agent_scores else None
        workflow_strengths = strengths[:]
        workflow_weaknesses = weaknesses[:]

        return JudgeResult(
            overall_score=score,
            strengths=strengths,
            weaknesses=weaknesses,
            per_agent_scores=per_agent_scores,
            strongest_agent=strongest_agent,
            weakest_agent=weakest_agent,
            workflow_strengths=workflow_strengths,
            workflow_weaknesses=workflow_weaknesses,
            recommendation="Final answer is ready for prototype use with human review.",
            provider=route.provider,
            model=route.model,
        )

    @staticmethod
    def evaluate_agent_output(agent_output: AgentOutput) -> AgentEvaluation:
        output = " ".join(agent_output.output.split())
        length = len(output)
        usefulness = 62
        clarity = 64
        if length > 120:
            usefulness += 10
            clarity += 6
        if length > 300:
            usefulness += 6
        if any(marker in output for marker in ("-", ":", "1.", "##")):
            clarity += 6
        if agent_output.success:
            usefulness += 5
        if agent_output.fallback_used:
            usefulness -= 4
        usefulness = max(0, min(100, usefulness))
        clarity = max(0, min(100, clarity))
        compact = output[:180] + ("..." if len(output) > 180 else "")
        weakness = "Output could be more specific or detailed." if length < 220 else "Could reduce repetition and sharpen prioritization."
        suggestion = f"Improve the {agent_output.agent_name} prompt by asking for concrete, task-specific evidence and concise bullets."
        return AgentEvaluation(
            agent_name=agent_output.agent_name,
            usefulness_score=usefulness,
            clarity_score=clarity,
            contribution_summary=compact or "No meaningful output was produced.",
            weakness=weakness,
            improvement_suggestion=suggestion,
        )
