from __future__ import annotations

from app.agents.master_agent import MasterOrchestratorAgent
from app.models.request_models import RunRequest
from app.models.response_models import RunResponse
from app.services.agent_scheduler_service import AgentSchedulerService


class KernelService:
    """Thin Agent OS kernel wrapper for request intake and orchestration.

    v3.0 keeps behavior stable: /api/run still returns the Master Agent response,
    while this service becomes the single route-level entry point for future
    scheduling, governance, and lifecycle coordination.
    """

    def __init__(self, master_agent: MasterOrchestratorAgent, scheduler: AgentSchedulerService):
        self.master_agent = master_agent
        self.scheduler = scheduler

    def run_workflow(self, request: RunRequest) -> RunResponse:
        return self.master_agent.run(request)
