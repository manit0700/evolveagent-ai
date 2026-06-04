from app.models.response_models import AgentOutput, JudgeResult


class EvolutionAgent:
    name = "Evolution Agent"
    system_prompt = (
        "You are the Evolution Agent. Your job is to suggest how the workflow can improve next time. "
        "Do not modify code. Only provide recommendations."
    )

    def recommend(self, task_type: str, outputs: list[AgentOutput], judge_result: JudgeResult) -> list[str]:
        recommendations = [
            "Ask each specialist agent to state assumptions when input details are missing.",
            "Keep evolution as recommendations only; do not modify code automatically.",
        ]

        if task_type == "resume":
            recommendations.append("For resume tasks, add an ATS Keyword Agent in a future version.")
        elif task_type == "coding":
            recommendations.append("For coding tasks, add a Testing Agent and Code Review Agent.")
        elif task_type == "finance":
            recommendations.append("For finance tasks, include probability-based scenarios and a visible not-financial-advice note.")
        elif task_type == "pharmacy":
            recommendations.append("For pharmacy tasks, add Criteria and ICD support agents with licensed professional review.")
        elif task_type == "business":
            recommendations.append("For business tasks, add Market Sizing and Competitor Analysis agents.")

        if judge_result.overall_score < 70:
            recommendations.append("If judge score is below 70, rerun Risk Agent and Writing Agent before returning.")

        if judge_result.per_agent_scores:
            weakest = min(
                judge_result.per_agent_scores,
                key=lambda item: item.usefulness_score + item.clarity_score,
            )
            strongest = max(
                judge_result.per_agent_scores,
                key=lambda item: item.usefulness_score + item.clarity_score,
            )
            recommendations.append(
                f"Improve the {weakest.agent_name} prompt first: {weakest.improvement_suggestion}"
            )
            if weakest.usefulness_score < 70:
                recommendations.append(
                    f"For similar tasks, consider skipping or narrowing {weakest.agent_name} unless its role is clearly needed."
                )
            recommendations.append(
                f"Keep {strongest.agent_name} in similar workflows because it provided the strongest contribution."
            )

        if judge_result.overall_score < 82:
            recommendations.append("Deep Mode may help if the task is important or the first judge score is below the target quality bar.")
        else:
            recommendations.append("Deep Mode is optional for similar tasks because the current workflow scored well.")

        return recommendations
