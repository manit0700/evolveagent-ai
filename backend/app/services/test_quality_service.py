from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.agents.test_generation_agent import TestGenerationAgent
from app.models.response_models import CommandResult, GovernanceEvent
from app.services.git_service import GitService
from app.services.governance_service import GovernanceService
from app.services.safe_command_runner import SafeCommandRunner
from app.services.storage_service import StorageService


class TestQualityService:
    __test__ = False

    filename = "quality_runs.json"

    def __init__(
        self,
        storage: StorageService,
        command_runner: SafeCommandRunner,
        git_service: GitService,
        governance_service: GovernanceService,
        test_generation_agent: TestGenerationAgent | None = None,
    ):
        self.storage = storage
        self.command_runner = command_runner
        self.git_service = git_service
        self.governance_service = governance_service
        self.test_generation_agent = test_generation_agent or TestGenerationAgent()

    def suggest_tests(self, changed_files: list[str] | None = None) -> dict:
        files = changed_files if changed_files is not None else self.git_service.list_changed_files()
        return self.test_generation_agent.suggest_tests(files)

    def run_quality_checks(self, commands: list[str] | None = None, issue_id: str | None = None) -> dict:
        commands_to_run = commands or ["pytest", "npm run build"]
        results = [self.command_runner.run(command) for command in commands_to_run]
        changed_files = self.git_service.list_changed_files()
        record = self.record_quality_run(
            command_results=results,
            changed_files=changed_files,
            issue_id=issue_id,
        )
        self.governance_service.log_event(
            GovernanceEvent(
                task_type="quality_engineering",
                agent_name="Test Quality Service",
                action_type="quality_checks_run",
                tool_used="safe_command_runner",
                command_requested=", ".join(commands_to_run),
                permission_level="approve_to_run",
                approved=True,
                blocked=not record["quality_gate"]["passed"],
                risk_score=25 if record["quality_gate"]["passed"] else 55,
                reason=record["quality_gate"]["reason"],
            )
        )
        return record

    def record_quality_run(
        self,
        command_results: list[CommandResult],
        changed_files: list[str] | None = None,
        issue_id: str | None = None,
    ) -> dict:
        result_records = [result.model_dump() for result in command_results]
        parsed = [self.parse_command_result(result) for result in command_results]
        coverage = self.parse_coverage()
        flaky_tests = self.detect_flaky_tests()
        quality_gate = self.evaluate_quality_gate(result_records, coverage)
        suggestions = self.suggest_tests(changed_files or [])
        record = {
            "quality_run_id": str(uuid4()),
            "issue_id": issue_id,
            "branch": self.git_service.current_branch(),
            "changed_files": changed_files or [],
            "test_suggestions": suggestions,
            "command_results": result_records,
            "parsed_results": parsed,
            "coverage": coverage,
            "flaky_tests": flaky_tests,
            "quality_gate": quality_gate,
            "regression_summary": self.build_regression_summary(result_records, coverage, flaky_tests, quality_gate),
            "created_at": datetime.now(UTC).isoformat(),
        }
        self.storage.append(self.filename, record)
        return record

    def latest_run(self) -> dict | None:
        runs = self.storage.read_list(self.filename)
        return runs[-1] if runs else None

    def list_runs(self, limit: int = 25) -> list[dict]:
        return list(reversed(self.storage.read_list(self.filename)[-limit:]))

    def parse_command_result(self, result: CommandResult) -> dict:
        output = f"{result.stdout}\n{result.stderr}"
        pytest_match = re.search(
            r"(?:(?P<passed>\d+) passed)?(?:,?\\s*(?P<failed>\d+) failed)?(?:,?\\s*(?P<skipped>\d+) skipped)?",
            output,
        )
        failed_tests = re.findall(r"FAILED\\s+([^\\s]+)", output)
        parsed = {
            "command": result.command,
            "success": result.success,
            "exit_code": result.exit_code,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "failed_tests": failed_tests,
        }
        if pytest_match:
            for key in ("passed", "failed", "skipped"):
                value = pytest_match.group(key)
                parsed[key] = int(value) if value else 0
        if result.command == "npm run build" and result.success:
            parsed["passed"] = max(parsed["passed"], 1)
        return parsed

    def parse_coverage(self) -> dict:
        coverage_xml = self.git_service.project_root / "backend" / "coverage.xml"
        if not coverage_xml.exists():
            return {
                "available": False,
                "coverage_percent": None,
                "source": None,
                "summary": "No coverage report found. Run pytest with coverage output to enable coverage tracking.",
            }
        try:
            root = ET.parse(coverage_xml).getroot()
            line_rate = float(root.attrib.get("line-rate", 0.0))
        except (ET.ParseError, ValueError):
            return {
                "available": False,
                "coverage_percent": None,
                "source": "backend/coverage.xml",
                "summary": "Coverage report exists but could not be parsed.",
            }
        percent = round(line_rate * 100, 2)
        return {
            "available": True,
            "coverage_percent": percent,
            "source": "backend/coverage.xml",
            "summary": f"Coverage report parsed at {percent}%.",
        }

    def detect_flaky_tests(self) -> list[dict]:
        history = self.storage.read_list(self.filename)
        outcomes: dict[str, list[bool]] = defaultdict(list)
        for run in history[-20:]:
            for parsed in run.get("parsed_results", []):
                for test_name in parsed.get("failed_tests", []):
                    outcomes[test_name].append(False)
            for parsed in run.get("parsed_results", []):
                if parsed.get("command") == "pytest" and parsed.get("success"):
                    outcomes["pytest suite"].append(True)
        flaky: list[dict] = []
        for test_name, values in outcomes.items():
            if len(values) >= 3 and any(values) and not all(values):
                flaky.append(
                    {
                        "test_name": test_name,
                        "recent_outcomes": values[-10:],
                        "reason": "Test has both pass and fail outcomes in recent quality history.",
                    }
                )
        return flaky

    def evaluate_quality_gate(self, command_results: list[dict], coverage: dict) -> dict:
        failures = [item for item in command_results if not item.get("success")]
        if failures:
            return {
                "passed": False,
                "blocked": True,
                "reason": f"Blocked because {len(failures)} quality command(s) failed.",
            }
        if coverage.get("available") and (coverage.get("coverage_percent") or 0) < 50:
            return {
                "passed": False,
                "blocked": True,
                "reason": "Blocked because coverage is below 50%.",
            }
        return {
            "passed": True,
            "blocked": False,
            "reason": "Quality gate passed: all required commands succeeded.",
        }

    def build_regression_summary(
        self,
        command_results: list[dict],
        coverage: dict,
        flaky_tests: list[dict],
        quality_gate: dict,
    ) -> str:
        lines = ["## Quality Gate Summary", ""]
        lines.append(f"- Gate: {'passed' if quality_gate.get('passed') else 'blocked'}")
        lines.append(f"- Reason: {quality_gate.get('reason')}")
        for result in command_results:
            status = "passed" if result.get("success") else "failed"
            lines.append(f"- `{result.get('command')}`: {status} (exit {result.get('exit_code')})")
        lines.append(f"- Coverage: {coverage.get('summary')}")
        if flaky_tests:
            lines.append(f"- Flaky tests flagged: {len(flaky_tests)}")
        else:
            lines.append("- Flaky tests flagged: 0")
        return "\n".join(lines)

    def summary(self) -> dict:
        runs = self.storage.read_list(self.filename)
        latest = runs[-1] if runs else None
        gate_counts = Counter("passed" if run.get("quality_gate", {}).get("passed") else "blocked" for run in runs)
        return {
            "total_quality_runs": len(runs),
            "latest_run": latest,
            "quality_gate_counts": dict(gate_counts),
            "flaky_tests": self.detect_flaky_tests(),
            "recent_runs": self.list_runs(10),
        }
