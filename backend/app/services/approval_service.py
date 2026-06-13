from __future__ import annotations

import json
import urllib.error
import urllib.request
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.config import settings
from app.models.response_models import GovernanceEvent
from app.services.governance_service import GovernanceService
from app.services.storage_service import StorageService


class ApprovalService:
    chains_file = "approval_chains.json"
    audit_file = "approval_audit.json"

    def __init__(self, storage: StorageService, governance: GovernanceService):
        self.storage = storage
        self.governance = governance

    def create_chain(
        self,
        *,
        run_id: str,
        session_id: str | None,
        workspace_id: str | None,
        task_type: str,
        action_type: str,
        summary: str,
        risk_level: str = "medium",
        steps: list[dict[str, Any]] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        existing = self.find_pending_for_run(run_id, action_type)
        if existing:
            return existing
        now = datetime.now(UTC).isoformat()
        approval_id = str(uuid4())
        chain_steps = steps or [
            {
                "title": self._step_title(action_type),
                "permission_level": self._permission_for_action(action_type),
            }
        ]
        normalized_steps = [
            {
                "step_id": str(uuid4()),
                "title": step.get("title") or self._step_title(action_type),
                "status": "pending",
                "permission_level": step.get("permission_level") or self._permission_for_action(action_type),
                "created_at": now,
                "decided_at": None,
                "comment": None,
            }
            for step in chain_steps
        ]
        chain = {
            "approval_id": approval_id,
            "run_id": run_id,
            "session_id": session_id,
            "workspace_id": workspace_id,
            "task_type": task_type,
            "action_type": action_type,
            "summary": summary,
            "risk_level": risk_level,
            "status": "pending",
            "steps": normalized_steps,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
        }
        chains = self.storage.read_list(self.chains_file)
        chains.append(chain)
        self.storage.write_list(self.chains_file, chains)
        self.governance.log_event(
            GovernanceEvent(
                run_id=run_id,
                session_id=session_id,
                workspace_id=workspace_id,
                task_type=task_type,
                agent_name="Approval Service",
                action_type="approval_requested",
                tool_used="ApprovalService",
                permission_level=normalized_steps[0]["permission_level"],
                approved=False,
                blocked=True,
                risk_score=self._risk_score(risk_level),
                reason=summary,
            )
        )
        self._notify_webhook(chain)
        return chain

    def list_chains(self, status: str | None = None, workspace_id: str | None = None) -> list[dict[str, Any]]:
        chains = self.storage.read_list(self.chains_file)
        if status:
            chains = [chain for chain in chains if chain.get("status") == status]
        if workspace_id:
            chains = [chain for chain in chains if chain.get("workspace_id") == workspace_id]
        return sorted(chains, key=lambda item: item.get("updated_at") or item.get("created_at") or "", reverse=True)

    def get_chain(self, approval_id: str) -> dict[str, Any] | None:
        return next((item for item in self.storage.read_list(self.chains_file) if item.get("approval_id") == approval_id), None)

    def find_pending_for_run(self, run_id: str, action_type: str | None = None) -> dict[str, Any] | None:
        return next(
            (
                chain
                for chain in self.storage.read_list(self.chains_file)
                if chain.get("run_id") == run_id
                and chain.get("status") == "pending"
                and (action_type is None or chain.get("action_type") == action_type)
            ),
            None,
        )

    def decide(self, approval_id: str, decision: str, comment: str | None = None) -> dict[str, Any]:
        chains = self.storage.read_list(self.chains_file)
        chain = next((item for item in chains if item.get("approval_id") == approval_id), None)
        if chain is None:
            raise ValueError("Approval not found.")
        if chain.get("status") not in {"pending"}:
            return chain
        if decision not in {"approve", "reject"}:
            raise ValueError("Decision must be approve or reject.")

        now = datetime.now(UTC).isoformat()
        status = "approved" if decision == "approve" else "rejected"
        for step in chain.get("steps", []):
            if step.get("status") == "pending":
                step["status"] = status
                step["decided_at"] = now
                step["comment"] = comment
                break
        if all(step.get("status") == "approved" for step in chain.get("steps", [])):
            chain["status"] = "approved"
        elif any(step.get("status") == "rejected" for step in chain.get("steps", [])):
            chain["status"] = "rejected"
        chain["updated_at"] = now
        self.storage.write_list(self.chains_file, chains)
        audit = self._audit_record(chain, decision, comment, now)
        self.storage.append(self.audit_file, audit)
        self.governance.log_event(
            GovernanceEvent(
                run_id=chain.get("run_id"),
                session_id=chain.get("session_id"),
                workspace_id=chain.get("workspace_id"),
                task_type=chain.get("task_type"),
                agent_name="Approval Service",
                action_type="approval_decision",
                tool_used="ApprovalService",
                permission_level=(chain.get("steps") or [{}])[0].get("permission_level", "approve_to_edit"),
                approved=decision == "approve",
                blocked=decision != "approve",
                risk_score=self._risk_score(chain.get("risk_level", "medium")),
                reason=comment or f"Approval chain {decision}d.",
            )
        )
        return chain

    def mark_rolled_back(self, approval_id: str, reason: str) -> dict[str, Any] | None:
        chains = self.storage.read_list(self.chains_file)
        chain = next((item for item in chains if item.get("approval_id") == approval_id), None)
        if chain is None:
            return None
        now = datetime.now(UTC).isoformat()
        chain["status"] = "rolled_back"
        chain["updated_at"] = now
        self.storage.write_list(self.chains_file, chains)
        self.storage.append(self.audit_file, self._audit_record(chain, "rollback", reason, now))
        return chain

    def audit(self, limit: int = 100, workspace_id: str | None = None) -> list[dict[str, Any]]:
        items = self.storage.read_list(self.audit_file)
        if workspace_id:
            items = [item for item in items if item.get("workspace_id") == workspace_id]
        return list(reversed(items[-limit:]))

    def _audit_record(self, chain: dict[str, Any], decision: str, comment: str | None, timestamp: str) -> dict[str, Any]:
        return {
            "audit_id": str(uuid4()),
            "approval_id": chain.get("approval_id"),
            "run_id": chain.get("run_id"),
            "session_id": chain.get("session_id"),
            "workspace_id": chain.get("workspace_id"),
            "task_type": chain.get("task_type"),
            "action_type": chain.get("action_type"),
            "decision": decision,
            "status": chain.get("status"),
            "risk_level": chain.get("risk_level"),
            "comment": comment,
            "created_at": timestamp,
        }

    def _notify_webhook(self, chain: dict[str, Any]) -> None:
        if not settings.approval_webhook_url:
            return
        payload = json.dumps(
            {
                "approval_id": chain.get("approval_id"),
                "run_id": chain.get("run_id"),
                "action_type": chain.get("action_type"),
                "summary": chain.get("summary"),
                "risk_level": chain.get("risk_level"),
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            settings.approval_webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            urllib.request.urlopen(request, timeout=3).close()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            self.governance.log_event(
                GovernanceEvent(
                    run_id=chain.get("run_id"),
                    session_id=chain.get("session_id"),
                    workspace_id=chain.get("workspace_id"),
                    task_type=chain.get("task_type"),
                    agent_name="Approval Service",
                    action_type="approval_webhook_failed",
                    tool_used="ApprovalService",
                    permission_level="read_only",
                    approved=False,
                    blocked=False,
                    risk_score=10,
                    reason=f"Approval webhook failed without blocking workflow: {exc}",
                )
            )

    def _permission_for_action(self, action_type: str) -> str:
        if action_type in {"command_run", "execute_tool"}:
            return "approve_to_run"
        return "approve_to_edit"

    def _step_title(self, action_type: str) -> str:
        return {
            "automation_apply": "Approve automation apply",
            "file_edit": "Approve file edit",
            "command_run": "Approve command run",
            "execute_tool": "Approve execute-level tool",
        }.get(action_type, "Approve action")

    def _risk_score(self, risk_level: str) -> int:
        return {"low": 20, "medium": 50, "high": 80}.get(risk_level, 50)
