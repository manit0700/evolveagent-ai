from datetime import UTC, datetime

from app.models.response_models import RunResponse
from app.services.storage_service import StorageService


class WorkflowStrategyService:
    def __init__(self, storage: StorageService):
        self.storage = storage

    def update_from_run(self, response: RunResponse) -> None:
        strategies = self.storage.read_list("workflow_strategies.json")
        existing = next(
            (
                item
                for item in strategies
                if item.get("task_type") == response.task_type and item.get("workspace_id") == response.workspace_id
            ),
            None,
        )
        score = response.judge_result.overall_score
        if existing is None:
            existing = {
                "task_type": response.task_type,
                "workspace_id": response.workspace_id,
                "run_count": 0,
                "average_score": 0,
                "best_agents": response.agents_used,
                "best_score": 0,
                "feedback_positive_rate": 0,
                "feedback_count": 0,
                "positive_feedback_count": 0,
                "fallback_rate": 0,
                "fallback_count": 0,
                "recommended_workflow": response.agents_used,
                "last_updated": None,
            }
            strategies.append(existing)
        count = existing["run_count"]
        existing["average_score"] = round(((existing["average_score"] * count) + score) / (count + 1), 2)
        existing["run_count"] = count + 1
        if any(output.fallback_used for output in response.agent_outputs + response.consensus_candidates) or response.judge_result.fallback_used:
            existing["fallback_count"] = existing.get("fallback_count", 0) + 1
        existing["fallback_rate"] = round(existing.get("fallback_count", 0) / existing["run_count"], 3)
        if score >= existing.get("best_score", 0):
            existing["best_score"] = score
            existing["best_agents"] = response.agents_used
            existing["recommended_workflow"] = response.agents_used
        existing["last_updated"] = datetime.now(UTC).isoformat()
        self.storage.write_list("workflow_strategies.json", strategies)

        models = self.storage.read_list("model_performance.json")
        for output in response.agent_outputs + response.consensus_candidates:
            key = f"{output.provider}:{output.model}"
            record = next(
                (
                    item
                    for item in models
                    if item.get("provider_model") == key and item.get("workspace_id") == response.workspace_id
                ),
                None,
            )
            if record is None:
                record = {
                    "provider_model": key,
                    "workspace_id": response.workspace_id,
                    "run_count": 0,
                    "average_latency_ms": 0,
                    "fallback_count": 0,
                }
                models.append(record)
            model_count = record["run_count"]
            record["average_latency_ms"] = round(
                ((record["average_latency_ms"] * model_count) + output.latency_ms) / (model_count + 1),
                2,
            )
            record["run_count"] = model_count + 1
            record["fallback_count"] += 1 if output.fallback_used else 0
        self.storage.write_list("model_performance.json", models)

    def update_feedback_stats(self, feedback: dict) -> None:
        run_id = feedback.get("run_id")
        if not run_id:
            return
        run = next((item for item in self.storage.read_list("agent_analytics.json") if item.get("run_id") == run_id), None)
        if not run:
            return
        strategies = self.storage.read_list("workflow_strategies.json")
        task_type = run.get("task_type", "unknown")
        existing = next(
            (
                item
                for item in strategies
                if item.get("task_type") == task_type and item.get("workspace_id") == run.get("workspace_id")
            ),
            None,
        )
        if existing is None:
            existing = {
                "task_type": task_type,
                "workspace_id": run.get("workspace_id"),
                "run_count": 0,
                "average_score": 0,
                "best_agents": run.get("agents_used", []),
                "best_score": run.get("overall_judge_score", 0),
                "recommended_workflow": run.get("agents_used", []),
                "feedback_count": 0,
                "positive_feedback_count": 0,
                "feedback_positive_rate": 0,
                "fallback_count": 0,
                "fallback_rate": 0,
                "last_updated": None,
            }
            strategies.append(existing)
        existing["feedback_count"] = existing.get("feedback_count", 0) + 1
        if feedback.get("rating") in {"helpful", "saved"}:
            existing["positive_feedback_count"] = existing.get("positive_feedback_count", 0) + 1
        existing["feedback_positive_rate"] = round(
            existing.get("positive_feedback_count", 0) / existing["feedback_count"],
            3,
        )
        existing["last_updated"] = datetime.now(UTC).isoformat()
        self.storage.write_list("workflow_strategies.json", strategies)
