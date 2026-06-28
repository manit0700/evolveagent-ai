from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.models.response_models import GovernanceEvent
from app.services.governance_service import GovernanceService
from app.services.storage_service import StorageService

# Universal action permission model.
PERMISSION_LEVELS = ["read", "draft", "type", "send", "delete", "pay", "external_share"]
# Sensitive actions that require explicit approval and are never auto-run.
_SENSITIVE = {"send", "delete", "pay", "external_share"}
SURFACES = ["desktop", "browser", "mobile", "cross_app"]
ACTION_DECISIONS = ["approve", "reject"]
# Keyword → planned permission level (mock interpretation of a workflow step).
_STEP_KEYWORDS = {
    "read": "read",
    "open": "read",
    "find": "read",
    "draft": "draft",
    "write": "draft",
    "type": "type",
    "fill": "type",
    "send": "send",
    "email": "send",
    "message": "send",
    "delete": "delete",
    "remove": "delete",
    "pay": "pay",
    "purchase": "pay",
    "checkout": "pay",
    "share": "external_share",
    "post": "external_share",
    "upload": "external_share",
}


class UniversalOperatorService:
    """v30.0 Universal App Operator (mock, planning-first).

    A foundation for operating desktop/browser/mobile apps via planned, governed
    workflows. It NEVER performs real desktop/browser/app automation: every step
    is a *planned action* with a permission level. Sensitive actions
    (send/delete/pay/external_share) require explicit approval and are never
    auto-run. Multi-device handoffs and a full audit trail are recorded, and all
    stateful actions are governance-logged.
    """

    sessions_file = "universal_operator_sessions.json"
    workflows_file = "universal_workflows.json"
    actions_file = "universal_actions.json"
    handoffs_file = "universal_handoffs.json"
    audit_file = "universal_operator_audit.json"

    def __init__(self, storage: StorageService, governance_service: GovernanceService):
        self.storage = storage
        self.governance = governance_service

    def _now(self) -> str:
        return datetime.now(UTC).isoformat()

    def _clean(self, value, max_length: int, default: str = "") -> str:
        return str(value if value is not None else default).strip()[:max_length]

    def _enum(self, value, allowed: list[str], default: str) -> str:
        candidate = str(value or "").strip().lower()
        return candidate if candidate in allowed else default

    def _string_list(self, values, limit: int = 20, item_max: int = 300) -> list[str]:
        cleaned: list[str] = []
        for value in values or []:
            text = str(value).strip()[:item_max]
            if text and text not in cleaned:
                cleaned.append(text)
            if len(cleaned) >= limit:
                break
        return cleaned

    def _audit(self, event_type: str, ref_id: str, detail: str, blocked: bool = False) -> None:
        self.storage.append(
            self.audit_file,
            {
                "audit_id": str(uuid4()),
                "event_type": event_type,
                "ref_id": ref_id,
                "detail": detail,
                "blocked": blocked,
                "created_at": self._now(),
            },
        )

    def _log(self, action_type: str, reason: str, blocked: bool = False) -> None:
        self.governance.log_event(
            GovernanceEvent(
                task_type="universal_operator",
                agent_name="Universal App Operator",
                action_type=action_type,
                tool_used="UniversalOperatorService",
                permission_level="read_only",
                approved=not blocked,
                blocked=blocked,
                risk_score=50 if blocked else 8,
                reason=reason,
            )
        )

    # ------------------------------------------------------------------
    # Sessions
    # ------------------------------------------------------------------
    def list_sessions(self) -> list[dict]:
        return self.storage.read_list(self.sessions_file)

    def create_session(self, data: dict) -> dict:
        session = {
            "session_id": str(uuid4()),
            "workspace_id": data.get("workspace_id"),
            "label": self._clean(data.get("label"), 160) or "Universal operator session",
            "surface": self._enum(data.get("surface"), SURFACES, "cross_app"),
            "apps": self._string_list(data.get("apps")),
            "status": "active",
            "mock_mode": True,
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        self.storage.append(self.sessions_file, session)
        self._audit("session_created", session["session_id"], f"Session '{session['label']}' on {session['surface']}.")
        self._log("universal_session_created", f"Created universal operator session {session['session_id']} (mock).")
        return session

    # ------------------------------------------------------------------
    # Workflows + planning
    # ------------------------------------------------------------------
    def list_workflows(self) -> list[dict]:
        return self.storage.read_list(self.workflows_file)

    def get_workflow(self, workflow_id: str) -> dict | None:
        return next((w for w in self.storage.read_list(self.workflows_file) if w.get("workflow_id") == workflow_id), None)

    def create_workflow(self, data: dict) -> dict:
        workflow = {
            "workflow_id": str(uuid4()),
            "session_id": self._clean(data.get("session_id"), 120) or None,
            "workspace_id": data.get("workspace_id"),
            "goal": self._clean(data.get("goal"), 2000),
            "steps": self._string_list(data.get("steps")),
            "status": "draft",
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        self.storage.append(self.workflows_file, workflow)
        self._audit("workflow_created", workflow["workflow_id"], f"Workflow: {workflow['goal'][:80]}")
        self._log("universal_workflow_created", f"Created cross-app workflow {workflow['workflow_id']}.")
        return workflow

    def _classify_step(self, step: str) -> str:
        lowered = step.lower()
        for keyword, level in _STEP_KEYWORDS.items():
            if keyword in lowered:
                return level
        return "read"

    def plan_workflow(self, workflow_id: str) -> dict:
        workflow = self.get_workflow(workflow_id)
        if workflow is None:
            raise ValueError("Workflow not found")
        steps = workflow.get("steps") or [workflow.get("goal", "")]
        planned: list[dict] = []
        for index, step in enumerate(steps):
            level = self._classify_step(step)
            sensitive = level in _SENSITIVE
            action = {
                "action_id": str(uuid4()),
                "workflow_id": workflow_id,
                "step_index": index,
                "description": self._clean(step, 300),
                "permission_level": level,
                "sensitive": sensitive,
                "requires_approval": sensitive,
                "status": "needs_approval" if sensitive else "planned",
                "created_at": self._now(),
                "updated_at": self._now(),
            }
            self.storage.append(self.actions_file, action)
            self._audit(
                "action_planned",
                action["action_id"],
                f"step {index}: {level} ({'sensitive' if sensitive else 'safe'})",
                blocked=False,
            )
            planned.append(action)
        # Mark workflow planned.
        workflows = self.storage.read_list(self.workflows_file)
        for item in workflows:
            if item.get("workflow_id") == workflow_id:
                item["status"] = "planned"
                item["updated_at"] = self._now()
        self.storage.write_list(self.workflows_file, workflows)
        self._log("universal_workflow_planned", f"Planned {len(planned)} action(s) for workflow {workflow_id}.")
        return {
            "workflow_id": workflow_id,
            "planned_actions": planned,
            "sensitive_action_count": sum(1 for a in planned if a["sensitive"]),
            "mock_mode": True,
            "note": "Planning only — no real app automation. Sensitive actions (send/delete/pay/external_share) require approval.",
        }

    # ------------------------------------------------------------------
    # Action decisions
    # ------------------------------------------------------------------
    def decide_action(self, action_id: str, decision: str) -> dict:
        actions = self.storage.read_list(self.actions_file)
        action = next((a for a in actions if a.get("action_id") == action_id), None)
        if action is None:
            raise ValueError("Action not found")
        resolved = self._enum(decision, ACTION_DECISIONS, "reject")
        if resolved == "approve":
            # Approval is recorded but the action is NEVER actually executed (mock).
            action["status"] = "approved_mock"
        else:
            action["status"] = "rejected"
        action["updated_at"] = self._now()
        self.storage.write_list(self.actions_file, actions)
        self._audit(
            "action_decided",
            action_id,
            f"{action.get('permission_level')} action {action['status']} (mock — not executed).",
        )
        self._log("universal_action_decided", f"Action {action_id} {action['status']}.")
        return action

    # ------------------------------------------------------------------
    # Multi-device handoffs
    # ------------------------------------------------------------------
    def create_handoff(self, data: dict) -> dict:
        handoff = {
            "handoff_id": str(uuid4()),
            "workflow_id": self._clean(data.get("workflow_id"), 120) or None,
            "from_device": self._clean(data.get("from_device"), 120) or "device-a",
            "to_device": self._clean(data.get("to_device"), 120) or "device-b",
            "summary": self._clean(data.get("summary"), 1000),
            "status": "planned",
            "mock_mode": True,
            "created_at": self._now(),
        }
        self.storage.append(self.handoffs_file, handoff)
        self._audit("handoff_created", handoff["handoff_id"], f"{handoff['from_device']} → {handoff['to_device']}.")
        self._log("universal_handoff_created", f"Created device handoff {handoff['handoff_id']} (mock).")
        return handoff

    def list_handoffs(self, limit: int = 25) -> list[dict]:
        return list(reversed(self.storage.read_list(self.handoffs_file)[-limit:]))

    # ------------------------------------------------------------------
    # Audit + dashboard
    # ------------------------------------------------------------------
    def audit_log(self, limit: int = 50) -> list[dict]:
        return list(reversed(self.storage.read_list(self.audit_file)[-limit:]))

    def dashboard(self) -> dict:
        sessions = self.storage.read_list(self.sessions_file)
        workflows = self.storage.read_list(self.workflows_file)
        actions = self.storage.read_list(self.actions_file)
        return {
            "total_sessions": len(sessions),
            "active_sessions": sum(1 for s in sessions if s.get("status") == "active"),
            "total_workflows": len(workflows),
            "planned_workflows": sum(1 for w in workflows if w.get("status") == "planned"),
            "total_actions": len(actions),
            "sensitive_actions": sum(1 for a in actions if a.get("sensitive")),
            "actions_awaiting_approval": sum(1 for a in actions if a.get("status") == "needs_approval"),
            "approved_mock_actions": sum(1 for a in actions if a.get("status") == "approved_mock"),
            "total_handoffs": len(self.storage.read_list(self.handoffs_file)),
            "audit_event_count": len(self.storage.read_list(self.audit_file)),
            "permission_levels": PERMISSION_LEVELS,
            "mock_mode": True,
            "safety_note": "Mock/planning-first — no real desktop/browser/app automation. Sensitive actions require approval; nothing is executed.",
        }
