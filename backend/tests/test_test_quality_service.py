from pathlib import Path

from app.models.response_models import CommandResult
from app.services.git_service import GitService
from app.services.governance_service import GovernanceService
from app.services.safe_command_runner import SafeCommandRunner
from app.services.storage_service import StorageService
from app.services.test_quality_service import TestQualityService


class FakeGitService(GitService):
    def __init__(self, project_root: Path):
        super().__init__(project_root)

    def current_branch(self) -> str:
        return "linear/evo-175"

    def list_changed_files(self) -> list[str]:
        return ["backend/app/services/example_service.py", "frontend/src/App.jsx"]


class FakeRunner(SafeCommandRunner):
    def __init__(self):
        pass

    def is_allowed(self, command: str) -> bool:
        return command in {"pytest", "npm run build"}

    def run(self, command: str) -> CommandResult:
        if command == "pytest":
            return CommandResult(command=command, exit_code=0, stdout="95 passed in 2.00s", success=True)
        return CommandResult(command=command, exit_code=0, stdout="vite build complete", success=True)


def make_service(tmp_path: Path) -> TestQualityService:
    storage = StorageService(str(tmp_path / "data"))
    governance = GovernanceService(storage)
    return TestQualityService(
        storage=storage,
        command_runner=FakeRunner(),
        git_service=FakeGitService(tmp_path),
        governance_service=governance,
    )


def test_suggest_tests_targets_backend_services(tmp_path: Path):
    service = make_service(tmp_path)
    result = service.suggest_tests(["backend/app/services/quality_service.py"])

    assert result["agent_name"] == "Test Generation Agent"
    assert result["suggestions"][0]["test_target"] == "backend/tests/test_quality_service.py"
    assert result["suggestions"][0]["priority"] == "high"


def test_quality_run_records_gate_and_summary(tmp_path: Path):
    service = make_service(tmp_path)
    result = service.run_quality_checks(["pytest", "npm run build"])

    assert result["quality_gate"]["passed"] is True
    assert "Quality Gate Summary" in result["regression_summary"]
    assert service.latest_run()["quality_run_id"] == result["quality_run_id"]


def test_quality_gate_blocks_failed_command(tmp_path: Path):
    service = make_service(tmp_path)
    coverage = {"available": False, "coverage_percent": None}
    gate = service.evaluate_quality_gate(
        [{"command": "pytest", "success": False, "exit_code": 1}],
        coverage,
    )

    assert gate["passed"] is False
    assert gate["blocked"] is True


def test_coverage_report_is_parsed(tmp_path: Path):
    service = make_service(tmp_path)
    coverage_file = tmp_path / "backend" / "coverage.xml"
    coverage_file.parent.mkdir(parents=True)
    coverage_file.write_text('<coverage line-rate="0.875"></coverage>', encoding="utf-8")

    coverage = service.parse_coverage()

    assert coverage["available"] is True
    assert coverage["coverage_percent"] == 87.5
