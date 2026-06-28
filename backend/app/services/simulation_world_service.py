from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.models.response_models import GovernanceEvent
from app.services.governance_service import GovernanceService
from app.services.storage_service import StorageService

SCENARIO_TYPES = ["business", "product", "project", "bug", "risk", "launch"]
# Keyword → risk weighting for deterministic mock scoring.
_RISK_KEYWORDS = {"urgent", "deadline", "legal", "payment", "security", "production", "compliance", "outage", "data loss"}


class SimulationWorldService:
    """v37.0 AI Simulation World.

    A safe, local sandbox to model decisions, personas, and scenarios (business,
    product, project, bug, risk, launch). Simulations are deterministic mock
    scoring — there are NO real-world actions. Outcomes, comparisons, and reports
    are generated from local records. Stateful actions are governance-logged.
    """

    worlds_file = "simulation_worlds.json"
    scenarios_file = "simulation_scenarios.json"
    personas_file = "simulation_personas.json"
    events_file = "simulation_events.json"
    outcomes_file = "simulation_outcomes.json"
    reports_file = "simulation_reports.json"

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

    def _log(self, action_type: str, reason: str) -> None:
        self.governance.log_event(
            GovernanceEvent(
                task_type="simulation_world",
                agent_name="Simulation World",
                action_type=action_type,
                tool_used="SimulationWorldService",
                permission_level="read_only",
                approved=True,
                blocked=False,
                risk_score=5,
                reason=reason,
            )
        )

    # ------------------------------------------------------------------
    # Worlds + personas
    # ------------------------------------------------------------------
    def create_world(self, data: dict) -> dict:
        world = {
            "world_id": str(uuid4()),
            "name": self._clean(data.get("name"), 160) or "Simulation world",
            "description": self._clean(data.get("description"), 2000),
            "created_at": self._now(),
        }
        self.storage.append(self.worlds_file, world)
        self._log("simulation_world_created", f"Created world: {world['name']}.")
        return world

    def list_worlds(self) -> list[dict]:
        return self.storage.read_list(self.worlds_file)

    def create_persona(self, data: dict) -> dict:
        persona = {
            "persona_id": str(uuid4()),
            "world_id": self._clean(data.get("world_id"), 120) or None,
            "name": self._clean(data.get("name"), 160) or "Persona",
            "persona_type": self._enum(data.get("persona_type"), ["user", "customer", "stakeholder", "other"], "user"),
            "goals": self._string_list(data.get("goals")),
            "pain_points": self._string_list(data.get("pain_points")),
            "created_at": self._now(),
        }
        self.storage.append(self.personas_file, persona)
        self._log("simulation_persona_created", f"Added persona: {persona['name']}.")
        return persona

    def list_personas(self) -> list[dict]:
        return self.storage.read_list(self.personas_file)

    # ------------------------------------------------------------------
    # Scenarios + run
    # ------------------------------------------------------------------
    def create_scenario(self, data: dict) -> dict:
        scenario = {
            "scenario_id": str(uuid4()),
            "world_id": self._clean(data.get("world_id"), 120) or None,
            "title": self._clean(data.get("title"), 200),
            "scenario_type": self._enum(data.get("scenario_type"), SCENARIO_TYPES, "business"),
            "description": self._clean(data.get("description"), 4000),
            "assumptions": self._string_list(data.get("assumptions")),
            "status": "created",
            "created_at": self._now(),
        }
        self.storage.append(self.scenarios_file, scenario)
        self._log("simulation_scenario_created", f"Created scenario: {scenario['title']}.")
        return scenario

    def list_scenarios(self) -> list[dict]:
        return self.storage.read_list(self.scenarios_file)

    def get_scenario(self, scenario_id: str) -> dict | None:
        return next((s for s in self.storage.read_list(self.scenarios_file) if s.get("scenario_id") == scenario_id), None)

    def _deterministic_score(self, scenario: dict) -> int:
        text = f"{scenario.get('title', '')} {scenario.get('description', '')} {' '.join(scenario.get('assumptions', []))}".lower()
        base = 60
        base += min(20, len(scenario.get("assumptions", [])) * 5)
        base -= sum(8 for kw in _RISK_KEYWORDS if kw in text)
        return max(0, min(100, base))

    def run_scenario(self, scenario_id: str) -> dict:
        scenario = self.get_scenario(scenario_id)
        if scenario is None:
            raise ValueError("Scenario not found")
        score = self._deterministic_score(scenario)
        text = f"{scenario.get('title', '')} {scenario.get('description', '')}".lower()
        risk_factors = [kw for kw in _RISK_KEYWORDS if kw in text]
        outcome = {
            "outcome_id": str(uuid4()),
            "scenario_id": scenario_id,
            "likely_result": "favorable" if score >= 65 else "uncertain" if score >= 45 else "challenged",
            "success_score": score,
            "risks": risk_factors or ["General execution risk"],
            "opportunities": ["Validated direction if assumptions hold", "Learnings reduce future uncertainty"],
            "failure_modes": ["Underestimated scope", "Unvalidated assumptions"],
            "assumptions_reviewed": scenario.get("assumptions", []),
            "simulation_only": True,
            "note": "Deterministic mock simulation — no real-world action taken.",
            "created_at": self._now(),
        }
        self.storage.append(self.outcomes_file, outcome)
        self.storage.append(self.events_file, {"event_id": str(uuid4()), "scenario_id": scenario_id, "event": "scenario_run", "created_at": self._now()})
        # Mark scenario run.
        scenarios = self.storage.read_list(self.scenarios_file)
        for item in scenarios:
            if item.get("scenario_id") == scenario_id:
                item["status"] = "run"
                item["last_score"] = score
        self.storage.write_list(self.scenarios_file, scenarios)
        self._log("simulation_scenario_run", f"Ran scenario {scenario_id} (score {score}).")
        return outcome

    # ------------------------------------------------------------------
    # Compare
    # ------------------------------------------------------------------
    def compare(self, scenario_ids: list[str]) -> dict:
        results = []
        for sid in scenario_ids or []:
            scenario = self.get_scenario(sid)
            if scenario is None:
                continue
            results.append(
                {
                    "scenario_id": sid,
                    "title": scenario.get("title"),
                    "score": scenario.get("last_score", self._deterministic_score(scenario)),
                }
            )
        results.sort(key=lambda r: r["score"], reverse=True)
        comparison = {
            "compared_count": len(results),
            "ranking": results,
            "recommended": results[0]["title"] if results else None,
            "note": "Comparison of deterministic mock scores — simulation only.",
        }
        self._log("simulation_compared", f"Compared {len(results)} scenario(s).")
        return comparison

    # ------------------------------------------------------------------
    # Reports
    # ------------------------------------------------------------------
    def create_report(self, data: dict) -> dict:
        scenarios = self.list_scenarios()
        outcomes = self.storage.read_list(self.outcomes_file)
        report = {
            "report_id": str(uuid4()),
            "title": self._clean(data.get("title"), 200) or "Simulation report",
            "world_count": len(self.list_worlds()),
            "scenario_count": len(scenarios),
            "outcome_count": len(outcomes),
            "average_score": round(sum(o.get("success_score", 0) for o in outcomes) / len(outcomes), 2) if outcomes else 0,
            "created_at": self._now(),
        }
        self.storage.append(self.reports_file, report)
        self._log("simulation_report_created", f"Generated simulation report {report['report_id']}.")
        return report

    def list_reports(self, limit: int = 25) -> list[dict]:
        return list(reversed(self.storage.read_list(self.reports_file)[-limit:]))

    # ------------------------------------------------------------------
    # Dashboard
    # ------------------------------------------------------------------
    def dashboard(self) -> dict:
        outcomes = self.storage.read_list(self.outcomes_file)
        return {
            "world_count": len(self.list_worlds()),
            "persona_count": len(self.list_personas()),
            "scenario_count": len(self.list_scenarios()),
            "outcome_count": len(outcomes),
            "report_count": len(self.storage.read_list(self.reports_file)),
            "average_score": round(sum(o.get("success_score", 0) for o in outcomes) / len(outcomes), 2) if outcomes else 0,
            "note": "Safe local sandbox — deterministic mock simulation, no real-world actions.",
        }
