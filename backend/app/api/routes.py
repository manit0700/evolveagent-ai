from datetime import UTC, datetime
from collections import Counter
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.agents.learning_agent import LearningAgent
from app.agents.master_agent import MasterOrchestratorAgent
from app.agents.memory_agent import MemoryAgent
from app.models.request_models import (
    AutomationApplyRequest,
    CreateChatRequest,
    CreateCustomAgentRequest,
    CreateGoalRequest,
    CreateGoalTaskRequest,
    FeedbackRequest,
    PromptDecisionRequest,
    PromptProposalRequest,
    RenameChatRequest,
    RunRequest,
    UpdateCustomAgentRequest,
    UpdateGoalRequest,
    UpdateGoalTaskRequest,
)
from app.models.response_models import AutomationApplyResult, GovernanceEvent, ProviderStatus, RunResponse
from app.services.governance_service import GovernanceService
from app.services.custom_agent_service import CustomAgentService
from app.services.goal_service import GoalService
from app.services.llm_router import llm_router
from app.services.permission_service import PermissionService
from app.services.file_service import FileService
from app.services.prompt_version_service import PromptVersionService
from app.services.recording_service import RecordingService
from app.services.safe_command_runner import SafeCommandRunner
from app.services.safe_file_editor import SafeFileEditor
from app.services.storage_service import StorageService
from app.services.user_preference_service import UserPreferenceService
from app.services.workflow_strategy_service import WorkflowStrategyService

router = APIRouter()
storage = StorageService()
memory_agent = MemoryAgent(storage)
master_agent = MasterOrchestratorAgent(storage=storage, memory_agent=memory_agent)
file_service = FileService(storage)
recording_service = RecordingService(storage)
safe_file_editor = SafeFileEditor()
safe_command_runner = SafeCommandRunner()
permission_service = PermissionService()
governance_service = GovernanceService(storage)
prompt_versions = PromptVersionService(storage)
learning_agent = LearningAgent(storage)
workflow_strategy = WorkflowStrategyService(storage)
user_preferences = UserPreferenceService(storage)
goal_service = GoalService(storage)
custom_agent_service = CustomAgentService(storage)


@router.post("/run", response_model=RunResponse)
def run_workflow(request: RunRequest) -> RunResponse:
    return master_agent.run(request)


@router.post("/files/upload")
async def upload_files(files: list[UploadFile] = File(...), session_id: str | None = Form(default=None)) -> dict:
    return {"files": await file_service.process_uploads(files, session_id=session_id)}


@router.post("/recordings/upload")
async def upload_recordings(files: list[UploadFile] = File(...), session_id: str | None = Form(default=None)) -> dict:
    return {"recordings": await recording_service.process_uploads(files, session_id=session_id)}


@router.get("/history")
def get_history() -> list[dict]:
    tasks = storage.read_list("tasks.json")
    return [
        {
            "task_id": task.get("task_id"),
            "task_type": task.get("task_type"),
            "judge_score": task.get("judge_result", {}).get("overall_score"),
            "created_at": task.get("created_at"),
        }
        for task in reversed(tasks)
    ]


@router.get("/memory")
def get_memory() -> list[dict]:
    return memory_agent.get_memory()


@router.get("/evolution")
def get_evolution_logs() -> list[dict]:
    return storage.read_list("evolution_logs.json")


@router.post("/feedback")
def save_feedback(request: FeedbackRequest) -> dict:
    item = request.model_dump()
    item["feedback_id"] = str(uuid4())
    item["created_at"] = datetime.now(UTC).isoformat()
    storage.append("feedback.json", item)
    workflow_strategy.update_feedback_stats(item)
    user_preferences.update_from_feedback(item)
    return {"saved": True, "feedback": item}


@router.post("/automation/apply", response_model=AutomationApplyResult)
def apply_automation(request: AutomationApplyRequest) -> AutomationApplyResult:
    runs = storage.read_list("automation_runs.json")
    run = next((item for item in runs if item.get("run_id") == request.run_id), None)
    if run is None:
        raise HTTPException(status_code=404, detail="Automation run not found")

    if not request.approved:
        run["status"] = "rejected"
        run["updated_at"] = datetime.now(UTC).isoformat()
        storage.write_list("automation_runs.json", runs)
        governance_service.log_event(
            GovernanceEvent(
                run_id=request.run_id,
                session_id=run.get("session_id"),
                task_type="app_automation",
                agent_name="Safety Permission Agent",
                action_type="automation_rejected",
                tool_used="PermissionService",
                permission_level="approve_to_edit",
                approved=False,
                blocked=True,
                risk_score=0,
                reason="User rejected the automation plan. No files were changed and no commands were run.",
            )
        )
        result = AutomationApplyResult(
            success=False,
            changed_files=[],
            created_files=[],
            command_results=[],
            errors=[],
            summary="Automation was rejected. No files were changed and no commands were run.",
        )
        storage.append("automation_logs.json", {"run_id": request.run_id, "approved": False, "result": result.model_dump()})
        return result

    plan = run.get("automation_plan", {})
    from app.models.response_models import AutomationPlan

    automation_plan = AutomationPlan(**plan)
    governance_service.log_event(
        GovernanceEvent(
            run_id=request.run_id,
            session_id=run.get("session_id"),
            task_type="app_automation",
            agent_name="Safety Permission Agent",
            action_type="automation_approved",
            tool_used="PermissionService",
            permission_level="approve_to_edit",
            approved=True,
            blocked=False,
            risk_score=0,
            reason="User approved automation plan for conservative safety validation.",
        )
    )
    result = safe_file_editor.apply_plan_conservatively(automation_plan)
    if result.errors:
        for error in result.errors:
            governance_service.log_event(
                GovernanceEvent(
                    run_id=request.run_id,
                    session_id=run.get("session_id"),
                    task_type="app_automation",
                    agent_name="Safe File Editor",
                    action_type="file_edit",
                    tool_used="SafeFileEditor",
                    permission_level="blocked",
                    approved=True,
                    blocked=True,
                    risk_score=80,
                    reason=error,
                )
            )
    command_results = []
    if result.success:
        for command in automation_plan.commands_to_run:
            permission_level = permission_service.permission_for_action("command_run", command=command)
            command_result = safe_command_runner.run(command)
            command_results.append(command_result)
            governance_service.log_event(
                GovernanceEvent(
                    run_id=request.run_id,
                    session_id=run.get("session_id"),
                    task_type="app_automation",
                    agent_name="Safe Command Runner",
                    action_type="command_run",
                    tool_used="SafeCommandRunner",
                    command_requested=command,
                    permission_level=permission_level if command_result.success else "blocked",
                    approved=True,
                    blocked=not command_result.success,
                    risk_score=0 if command_result.success else 65,
                    reason=command_result.stderr or "Allowlisted command completed.",
                )
            )
        result.command_results = command_results
        if command_results and not all(item.success for item in command_results):
            result.success = False
            result.errors.append("One or more allowlisted commands failed. Review command output before applying further changes.")
            result.summary += " Command verification found failures."

    run["status"] = "applied" if result.success else "failed"
    run["apply_result"] = result.model_dump()
    run["updated_at"] = datetime.now(UTC).isoformat()
    storage.write_list("automation_runs.json", runs)
    storage.append("automation_logs.json", {"run_id": request.run_id, "approved": True, "result": result.model_dump()})
    return result


@router.get("/learning/report")
def get_learning_report() -> dict:
    return learning_agent.report()


@router.get("/learning/prompt-versions")
def get_prompt_versions() -> list[dict]:
    return prompt_versions.list_versions()


@router.post("/learning/propose-prompt")
def propose_prompt(request: PromptProposalRequest) -> dict:
    return prompt_versions.propose(request.agent_name, request.reason, request.proposed_prompt)


@router.post("/learning/approve-prompt")
def approve_prompt(request: PromptDecisionRequest) -> dict:
    try:
        return prompt_versions.set_status(request.agent_name, request.version_id, "active")
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/learning/reject-prompt")
def reject_prompt(request: PromptDecisionRequest) -> dict:
    try:
        return prompt_versions.set_status(request.agent_name, request.version_id, "rejected")
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/learning/rollback-prompt")
def rollback_prompt(request: PromptDecisionRequest) -> dict:
    try:
        return prompt_versions.rollback(request.agent_name, request.version_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/analytics")
def get_analytics() -> dict:
    runs = storage.read_list("agent_analytics.json")
    feedback = storage.read_list("feedback.json")
    goals = storage.read_list("goals.json")
    task_graphs = storage.read_list("task_graphs.json")
    custom_agents = storage.read_list("custom_agents.json")
    total_runs = len(runs)
    scores = [item.get("overall_judge_score", 0) for item in runs if item.get("overall_judge_score") is not None]
    latencies = [item.get("latency_ms", 0) for item in runs if item.get("latency_ms") is not None]
    task_counts = Counter(item.get("task_type", "unknown") for item in runs)
    agent_counts = Counter(agent for item in runs for agent in item.get("agents_used", []))
    feedback_counts = Counter(item.get("rating", "unknown") for item in feedback)
    goal_tasks = [task for graph in task_graphs for task in graph.get("tasks", [])]
    completed_goal_tasks = sum(1 for task in goal_tasks if task.get("status") == "done")
    active_goals = [goal for goal in goals if goal.get("status") == "active"]
    completed_goals = [goal for goal in goals if goal.get("status") == "completed"]
    custom_agent_counts = Counter(item.get("custom_agent_name") for item in runs if item.get("custom_agent_used"))
    return {
        "total_runs": total_runs,
        "average_judge_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "average_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else 0,
        "most_common_task_type": task_counts.most_common(1)[0][0] if task_counts else None,
        "most_used_agents": [{"agent_name": name, "count": count} for name, count in agent_counts.most_common(8)],
        "fallback_count": sum(1 for item in runs if item.get("fallback_used")),
        "file_task_count": sum(1 for item in runs if item.get("file_context_used")),
        "recording_task_count": sum(1 for item in runs if item.get("recording_context_used")),
        "image_task_count": sum(1 for item in runs if item.get("image_task")),
        "total_goals": len(goals),
        "active_goals": len(active_goals),
        "completed_goals": len(completed_goals),
        "total_goal_tasks": len(goal_tasks),
        "completed_goal_tasks": completed_goal_tasks,
        "blocked_goal_tasks": sum(1 for task in goal_tasks if task.get("status") == "blocked"),
        "custom_agents_count": len([item for item in custom_agents if item.get("enabled", True)]),
        "most_used_custom_agent": custom_agent_counts.most_common(1)[0][0] if custom_agent_counts else None,
        "task_completion_rate": round((completed_goal_tasks / len(goal_tasks)) * 100, 2) if goal_tasks else 0,
        "goal_success_rate": round((len(completed_goals) / len(goals)) * 100, 2) if goals else 0,
        "feedback_summary": {
            "helpful": feedback_counts.get("helpful", 0),
            "not_helpful": feedback_counts.get("not_helpful", 0),
            "saved": feedback_counts.get("saved", 0),
            "total": len(feedback),
        },
        "recent_runs": list(reversed(runs[-10:])),
    }


@router.get("/governance")
def get_governance() -> dict:
    return governance_service.summary()


@router.post("/goals")
def create_goal(request: CreateGoalRequest) -> dict:
    if request.prompt:
        _, planner_result = master_agent.goal_planner.run(request.prompt)
        if request.title:
            planner_result["goal_title"] = request.title
        if request.description:
            planner_result["goal_summary"] = request.description
        goal, task_graph = goal_service.create_from_plan(
            planner_result,
            source_session_id=request.source_session_id,
            source_message_id=request.source_message_id,
            tags=request.tags,
        )
    elif request.title:
        goal, task_graph = goal_service.create_manual(request.title, request.description or "", tags=request.tags)
    else:
        raise HTTPException(status_code=422, detail="Provide either prompt or title.")
    governance_service.log_event(
        GovernanceEvent(
            run_id=None,
            session_id=request.source_session_id,
            task_type="goal_planning",
            agent_name="Mission Control",
            action_type="goal_created",
            tool_used="GoalService",
            permission_level="plan_only",
            approved=False,
            blocked=False,
            risk_score=0,
            reason=f"Goal {goal.goal_id} was created.",
        )
    )
    return {"goal": goal.model_dump(), "task_graph": task_graph.model_dump()}


@router.get("/goals")
def list_goals() -> list[dict]:
    return goal_service.list_goals()


@router.get("/goals/{goal_id}")
def get_goal(goal_id: str) -> dict:
    result = goal_service.get_goal(goal_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal, task_graph = result
    return {"goal": goal, "task_graph": task_graph}


@router.patch("/goals/{goal_id}")
def update_goal(goal_id: str, request: UpdateGoalRequest) -> dict:
    goal = goal_service.update_goal(goal_id, request.model_dump(exclude_unset=True))
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str) -> dict:
    goal = goal_service.archive_goal(goal_id)
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"archived": True, "goal": goal}


@router.post("/goals/{goal_id}/tasks")
def add_goal_task(goal_id: str, request: CreateGoalTaskRequest) -> dict:
    task = goal_service.add_task(goal_id, request.model_dump())
    if task is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    return task.model_dump()


@router.patch("/goals/{goal_id}/tasks/{task_id}")
def update_goal_task(goal_id: str, task_id: str, request: UpdateGoalTaskRequest) -> dict:
    task = goal_service.update_task(goal_id, task_id, request.model_dump(exclude_unset=True))
    if task is None:
        raise HTTPException(status_code=404, detail="Goal task not found")
    return task.model_dump()


@router.post("/goals/{goal_id}/tasks/{task_id}/run", response_model=RunResponse)
def run_goal_task(goal_id: str, task_id: str) -> RunResponse:
    task = goal_service.get_task(goal_id, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Goal task not found")
    goal_service.update_task(goal_id, task_id, {"status": "running"})
    request = RunRequest(
        user_input=f"{task.get('title')}\n\n{task.get('description', '')}".strip(),
        task_type="auto",
        goal_id=goal_id,
        task_id=task_id,
    )
    response = master_agent.run(request)
    final_status = "needs_approval" if response.requires_approval else "done"
    goal_service.update_task(
        goal_id,
        task_id,
        {
            "status": final_status,
            "last_run_id": response.run_id,
            "last_result_summary": response.final_output[:240],
        },
    )
    governance_service.log_event(
        GovernanceEvent(
            run_id=response.run_id,
            session_id=response.session_id,
            task_type=response.task_type,
            agent_name="Mission Control",
            action_type="goal_task_run",
            tool_used="GoalService",
            permission_level="plan_only",
            approved=False,
            blocked=False,
            risk_score=response.security_report.risk_score,
            reason=f"Ran goal task {task_id} through the existing agent workflow.",
        )
    )
    return response


@router.get("/agents/templates")
def list_agent_templates() -> list[dict]:
    return custom_agent_service.templates()


@router.post("/agents/custom")
def create_custom_agent(request: CreateCustomAgentRequest) -> dict:
    agent = custom_agent_service.create(request.model_dump())
    governance_service.log_event(
        GovernanceEvent(
            agent_name="Custom Agent Builder",
            action_type="custom_agent_created",
            tool_used="CustomAgentService",
            permission_level=agent.approval_level,
            approved=False,
            blocked=False,
            reason=f"Custom agent {agent.name} was created.",
        )
    )
    return agent.model_dump()


@router.get("/agents/custom")
def list_custom_agents() -> list[dict]:
    return custom_agent_service.list()


@router.get("/agents/custom/{agent_id}")
def get_custom_agent(agent_id: str) -> dict:
    agent = custom_agent_service.get(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Custom agent not found")
    return agent


@router.patch("/agents/custom/{agent_id}")
def update_custom_agent(agent_id: str, request: UpdateCustomAgentRequest) -> dict:
    agent = custom_agent_service.update(agent_id, request.model_dump(exclude_unset=True))
    if agent is None:
        raise HTTPException(status_code=404, detail="Custom agent not found")
    governance_service.log_event(
        GovernanceEvent(
            agent_name="Custom Agent Builder",
            action_type="custom_agent_edited",
            tool_used="CustomAgentService",
            permission_level=agent.get("approval_level", "read_only"),
            approved=False,
            blocked=False,
            reason=f"Custom agent {agent.get('name')} was updated.",
        )
    )
    return agent


@router.delete("/agents/custom/{agent_id}")
def delete_custom_agent(agent_id: str) -> dict:
    agent = custom_agent_service.delete(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Custom agent not found")
    return {"disabled": True, "agent": agent}


@router.get("/providers/status", response_model=ProviderStatus)
def get_provider_status() -> ProviderStatus:
    return llm_router.status()


@router.get("/chats")
def get_chats() -> list[dict]:
    sessions = storage.read_list("chat_sessions.json")
    messages = storage.read_list("messages.json")
    summaries = [
        {
            "session_id": session.get("session_id"),
            "title": session.get("title", "Untitled chat"),
            "created_at": session.get("created_at"),
            "updated_at": session.get("updated_at"),
            "message_count": len([message for message in messages if message.get("session_id") == session.get("session_id")])
            or len(session.get("messages", [])),
        }
        for session in sessions
    ]
    return sorted(summaries, key=lambda item: item.get("updated_at") or "", reverse=True)


@router.post("/chats")
def create_chat(request: CreateChatRequest | None = None) -> dict:
    now = datetime.now(UTC).isoformat()
    session = {
        "session_id": str(uuid4()),
        "title": (request.title.strip() if request and request.title else "New Chat"),
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }
    sessions = storage.read_list("chat_sessions.json")
    sessions.append(session)
    storage.write_list("chat_sessions.json", sessions)
    return session


@router.get("/chats/{session_id}")
def get_chat(session_id: str) -> dict:
    session = next((item for item in storage.read_list("chat_sessions.json") if item.get("session_id") == session_id), None)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    messages = [
        message
        for message in storage.read_list("messages.json")
        if message.get("session_id") == session_id
    ]
    if not messages:
        messages = session.get("messages", [])
    session = {**session, "messages": sorted(messages, key=lambda item: item.get("created_at") or "")}
    return session


@router.patch("/chats/{session_id}")
def rename_chat(session_id: str, request: RenameChatRequest) -> dict:
    sessions = storage.read_list("chat_sessions.json")
    session = next((item for item in sessions if item.get("session_id") == session_id), None)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    session["title"] = request.title.strip()
    storage.write_list("chat_sessions.json", sessions)
    return session


@router.delete("/chats/{session_id}")
def delete_chat(session_id: str) -> dict[str, bool]:
    sessions = storage.read_list("chat_sessions.json")
    next_sessions = [item for item in sessions if item.get("session_id") != session_id]
    if len(next_sessions) == len(sessions):
        raise HTTPException(status_code=404, detail="Chat session not found")
    storage.write_list("chat_sessions.json", next_sessions)
    next_messages = [item for item in storage.read_list("messages.json") if item.get("session_id") != session_id]
    storage.write_list("messages.json", next_messages)
    return {"deleted": True}


@router.delete("/chats/{session_id}/messages/{message_id}")
def delete_message(session_id: str, message_id: str) -> dict[str, bool]:
    sessions = storage.read_list("chat_sessions.json")
    session = next((item for item in sessions if item.get("session_id") == session_id), None)
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = storage.read_list("messages.json")
    next_messages = [
        item
        for item in messages
        if not (item.get("session_id") == session_id and item.get("message_id", item.get("id")) == message_id)
    ]
    embedded_messages = session.get("messages", [])
    next_embedded = [
        item for item in embedded_messages if item.get("message_id", item.get("id")) != message_id
    ]

    if len(next_messages) == len(messages) and len(next_embedded) == len(embedded_messages):
        raise HTTPException(status_code=404, detail="Message not found")

    session["messages"] = next_embedded
    session["updated_at"] = datetime.now(UTC).isoformat()
    storage.write_list("chat_sessions.json", sessions)
    storage.write_list("messages.json", next_messages)
    return {"deleted": True}
