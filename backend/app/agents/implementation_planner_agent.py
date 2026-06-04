from app.models.response_models import AutomationPlan, ProjectScanResult


class ImplementationPlannerAgent:
    name = "Implementation Planner Agent"

    def plan(self, user_input: str, project_scan: ProjectScanResult) -> AutomationPlan:
        lowered = user_input.lower()
        files_to_change = project_scan.relevant_files[:5]
        files_to_create: list[str] = []
        if any(word in lowered for word in ("page", "component", "screen")) and "frontend/src/App.jsx" not in files_to_change:
            files_to_change.insert(0, "frontend/src/App.jsx")
        if "test" in lowered and "backend/tests/test_api.py" not in files_to_change:
            files_to_change.append("backend/tests/test_api.py")
        if any(word in lowered for word in ("login", "auth", "delete", "payment", "secret", "env")):
            risk_level = "high"
        elif any(word in lowered for word in ("edit", "modify", "run", "fix", "implement", "change")):
            risk_level = "medium"
        else:
            risk_level = "low"

        commands = []
        if "test" in lowered or "bug" in lowered or "fix" in lowered:
            commands.extend(project_scan.test_commands[:1])
        if "build" in lowered or "ui" in lowered or "frontend" in lowered or "component" in lowered:
            commands.extend(project_scan.build_commands[:1])

        return AutomationPlan(
            summary=(
                "I prepared a safe implementation plan. No files will be changed until you approve the plan. "
                f"The request appears to be: {user_input.strip()}"
            ),
            files_to_change=files_to_change[:5],
            files_to_create=files_to_create,
            commands_to_run=list(dict.fromkeys(commands)),
            risk_level=risk_level,
            requires_approval=True,
            notes=[
                "This plan is advisory until approved.",
                "MVP v2.0 blocks destructive edits, package installation, and unrestricted shell commands.",
                "A conservative apply step can validate paths and run only allowlisted build/test commands.",
            ],
            project_scan=project_scan,
            consensus_candidates=[
                {
                    "provider": "openai_or_mock",
                    "summary": "Primary plan prioritizes minimal scoped edits and test/build verification.",
                },
                {
                    "provider": "mock",
                    "summary": "Safety comparison recommends approval before edits and no destructive operations.",
                },
            ],
            judge_reason="Selected the safest plan because it limits edited files, avoids secrets, and requires approval.",
        )
