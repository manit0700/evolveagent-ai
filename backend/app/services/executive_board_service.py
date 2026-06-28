from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime
from uuid import uuid4

from app.models.response_models import GovernanceEvent
from app.services.governance_service import GovernanceService
from app.services.storage_service import StorageService

EXECUTIVE_ROLES = ["CEO", "CTO", "CFO", "COO", "Legal/Compliance", "Product", "Marketing", "Security"]
VOTE_VALUES = ["approve", "reject", "abstain"]

# Per-role perspective lenses (advisory framing only).
_ROLE_LENS = {
    "CEO": ("Strategic fit and overall company direction.", "Does this advance the mission and create durable value?"),
    "CTO": ("Technical feasibility and architecture risk.", "Can we build and maintain this safely and on time?"),
    "CFO": ("Cost, ROI, and financial risk.", "What does this cost, and what is the expected return?"),
    "COO": ("Operations and execution capacity.", "Do we have the people and processes to deliver?"),
    "Legal/Compliance": ("Legal, regulatory, and compliance exposure.", "What obligations or risks does this create? (Not legal advice.)"),
    "Product": ("User value and roadmap impact.", "Does this solve a real user problem better than alternatives?"),
    "Marketing": ("Positioning, demand, and go-to-market.", "Can we explain and sell this clearly?"),
    "Security": ("Security and data-protection risk.", "What is the attack surface and data exposure?"),
}


class ExecutiveBoardService:
    """v35.0 AI Executive Board.

    Reviews strategic decisions from multiple executive perspectives (CEO, CTO,
    CFO, COO, Legal/Compliance, Product, Marketing, Security), produces a
    board-style review (risks/opportunities/costs/technical/compliance), a final
    recommendation, and an executive summary report. It ADVISES and SUMMARIZES —
    it does not execute actions. Stateful actions are governance-logged.
    """

    sessions_file = "executive_board_sessions.json"
    votes_file = "executive_board_votes.json"
    reports_file = "executive_board_reports.json"
    recommendations_file = "executive_board_recommendations.json"

    def __init__(self, storage: StorageService, governance_service: GovernanceService):
        self.storage = storage
        self.governance = governance_service

    def _now(self) -> str:
        return datetime.now(UTC).isoformat()

    def _clean(self, value, max_length: int, default: str = "") -> str:
        return str(value if value is not None else default).strip()[:max_length]

    def _log(self, action_type: str, reason: str) -> None:
        self.governance.log_event(
            GovernanceEvent(
                task_type="executive_board",
                agent_name="AI Executive Board",
                action_type=action_type,
                tool_used="ExecutiveBoardService",
                permission_level="read_only",
                approved=True,
                blocked=False,
                risk_score=6,
                reason=reason,
            )
        )

    # ------------------------------------------------------------------
    # Sessions
    # ------------------------------------------------------------------
    def list_sessions(self) -> list[dict]:
        return self.storage.read_list(self.sessions_file)

    def get_session(self, session_id: str) -> dict | None:
        return next((s for s in self.storage.read_list(self.sessions_file) if s.get("session_id") == session_id), None)

    def _perspectives(self, decision: str) -> list[dict]:
        perspectives = []
        for role in EXECUTIVE_ROLES:
            lens, question = _ROLE_LENS[role]
            perspectives.append(
                {
                    "role": role,
                    "lens": lens,
                    "key_question": question,
                    "assessment": f"{role} view on: {decision[:140]}",
                }
            )
        return perspectives

    def create_session(self, data: dict) -> dict:
        decision = self._clean(data.get("decision"), 2000)
        session = {
            "session_id": str(uuid4()),
            "title": self._clean(data.get("title"), 200) or "Board decision review",
            "decision": decision,
            "context": self._clean(data.get("context"), 4000),
            "perspectives": self._perspectives(decision),
            "status": "open",
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        self.storage.append(self.sessions_file, session)
        self._log("executive_board_session_created", f"Created board session: {session['title']}.")
        return session

    # ------------------------------------------------------------------
    # Review
    # ------------------------------------------------------------------
    def review(self, session_id: str) -> dict:
        session = self.get_session(session_id)
        if session is None:
            raise ValueError("Session not found")
        decision = session.get("decision", "")
        review = {
            "risks": [
                "Execution risk if scope is underestimated.",
                "Opportunity cost vs. other initiatives.",
            ],
            "opportunities": [
                "Potential to strengthen the company's strategic position.",
                "Possible new value for users/customers.",
            ],
            "costs": ["Time and engineering effort", "Ongoing maintenance and support"],
            "technical_concerns": ["Architecture and reliability", "Security and data handling"],
            "compliance_concerns": ["Regulatory exposure to validate (not legal advice)", "Data-protection obligations"],
            "role_summaries": [{"role": p["role"], "key_question": p["key_question"]} for p in session.get("perspectives", [])],
        }
        recommendation = self._recommendation(decision)
        # Persist the recommendation.
        rec_record = {
            "recommendation_id": str(uuid4()),
            "session_id": session_id,
            "recommendation": recommendation,
            "created_at": self._now(),
        }
        self.storage.append(self.recommendations_file, rec_record)
        # Mark session reviewed + store review.
        sessions = self.storage.read_list(self.sessions_file)
        for item in sessions:
            if item.get("session_id") == session_id:
                item["status"] = "reviewed"
                item["review"] = review
                item["recommendation"] = recommendation
                item["updated_at"] = self._now()
        self.storage.write_list(self.sessions_file, sessions)
        self._log("executive_board_reviewed", f"Generated board review for session {session_id}.")
        return {"session_id": session_id, "review": review, "recommendation": recommendation}

    def _recommendation(self, decision: str) -> str:
        return (
            "Proceed in a small, governed pilot: validate the riskiest assumption, confirm cost/compliance, "
            "and re-review at the board before broad rollout. (Advisory only — the board does not execute actions.)"
        )

    # ------------------------------------------------------------------
    # Votes
    # ------------------------------------------------------------------
    def vote(self, session_id: str, data: dict) -> dict:
        if self.get_session(session_id) is None:
            raise ValueError("Session not found")
        role = self._clean(data.get("role"), 60)
        role = role if role in EXECUTIVE_ROLES else "CEO"
        value = str(data.get("vote", "abstain")).strip().lower()
        value = value if value in VOTE_VALUES else "abstain"
        vote = {
            "vote_id": str(uuid4()),
            "session_id": session_id,
            "role": role,
            "vote": value,
            "rationale": self._clean(data.get("rationale"), 1000),
            "created_at": self._now(),
        }
        self.storage.append(self.votes_file, vote)
        self._log("executive_board_vote_cast", f"{role} voted {value} on session {session_id}.")
        return vote

    def _votes_for(self, session_id: str) -> list[dict]:
        return [v for v in self.storage.read_list(self.votes_file) if v.get("session_id") == session_id]

    def _tally(self, session_id: str) -> dict:
        counts = Counter(v.get("vote") for v in self._votes_for(session_id))
        return {"approve": counts.get("approve", 0), "reject": counts.get("reject", 0), "abstain": counts.get("abstain", 0)}

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------
    def create_report(self, session_id: str) -> dict:
        session = self.get_session(session_id)
        if session is None:
            raise ValueError("Session not found")
        tally = self._tally(session_id)
        report = {
            "report_id": str(uuid4()),
            "session_id": session_id,
            "title": f"Executive summary: {session.get('title')}",
            "decision": session.get("decision"),
            "vote_tally": tally,
            "board_lean": "approve" if tally["approve"] > tally["reject"] else "reject" if tally["reject"] > tally["approve"] else "split",
            "recommendation": session.get("recommendation")
            or self._recommendation(session.get("decision", "")),
            "perspectives_count": len(session.get("perspectives", [])),
            "generated_at": self._now(),
            "note": "Advisory executive summary — the board does not execute actions.",
        }
        self.storage.append(self.reports_file, report)
        self._log("executive_board_report_created", f"Generated executive report for session {session_id}.")
        return report

    def list_reports(self, limit: int = 25) -> list[dict]:
        return list(reversed(self.storage.read_list(self.reports_file)[-limit:]))

    def list_recommendations(self, limit: int = 25) -> list[dict]:
        return list(reversed(self.storage.read_list(self.recommendations_file)[-limit:]))

    # ------------------------------------------------------------------
    # Dashboard
    # ------------------------------------------------------------------
    def dashboard(self) -> dict:
        sessions = self.list_sessions()
        return {
            "total_sessions": len(sessions),
            "reviewed_sessions": sum(1 for s in sessions if s.get("status") == "reviewed"),
            "total_votes": len(self.storage.read_list(self.votes_file)),
            "total_reports": len(self.storage.read_list(self.reports_file)),
            "total_recommendations": len(self.storage.read_list(self.recommendations_file)),
            "executive_roles": EXECUTIVE_ROLES,
            "recent_sessions": list(reversed(sessions[-5:])),
            "note": "The executive board advises and summarizes from multiple perspectives — it does not execute actions.",
        }
