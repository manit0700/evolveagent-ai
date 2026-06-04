from uuid import uuid4

from app.models.response_models import AgentOutput


class GoalPlannerAgent:
    name = "Goal Planner Agent"

    def run(self, user_input: str) -> tuple[AgentOutput, dict]:
        goal_title = self.make_title(user_input)
        goal_type = self.detect_goal_type(user_input)
        phases = self.phases_for_goal(goal_type)
        tasks = self.tasks_for_goal(goal_type)
        recommended_agents = self.recommended_agents(goal_type)
        risk_level = self.risk_level(user_input, goal_type)
        next_best_task = tasks[0]["title"] if tasks else "Clarify the goal scope"
        summary = (
            f"{goal_title} is organized into {len(phases)} phase(s) and {len(tasks)} task(s). "
            f"The next best task is: {next_best_task}."
        )
        result = {
            "goal_title": goal_title,
            "goal_summary": summary,
            "phases": phases,
            "tasks": tasks,
            "recommended_agents": recommended_agents,
            "risk_level": risk_level,
            "next_best_task": next_best_task,
        }
        output = AgentOutput(
            agent_name=self.name,
            provider="rule-based",
            model="goal-planner-v1",
            latency_ms=0,
            success=True,
            fallback_used=False,
            output=summary,
        )
        return output, result

    @staticmethod
    def make_title(user_input: str) -> str:
        cleaned = " ".join(user_input.strip().split())
        remove_prefixes = [
            "build me",
            "build",
            "create",
            "make",
            "plan",
            "help me",
            "break this goal into tasks",
        ]
        lowered = cleaned.lower()
        for prefix in remove_prefixes:
            if lowered.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip(" :-")
                break
        words = cleaned.split()[:7]
        title = " ".join(words) or "New Mission"
        return title.title()

    @staticmethod
    def detect_goal_type(user_input: str) -> str:
        lowered = user_input.lower()
        if any(word in lowered for word in ("app", "saas", "website", "frontend", "backend", "api")):
            return "software_project"
        if any(word in lowered for word in ("resume", "internship", "cover letter", "job")):
            return "career"
        if any(word in lowered for word in ("study", "exam", "lecture", "class")):
            return "study"
        if any(word in lowered for word in ("startup", "business", "market", "customer")):
            return "business"
        return "general"

    @staticmethod
    def phases_for_goal(goal_type: str) -> list[str]:
        if goal_type == "software_project":
            return ["Discovery", "Architecture", "Implementation", "Testing", "Demo"]
        if goal_type == "career":
            return ["Profile Review", "Keyword Targeting", "Rewrite", "Proofread", "Apply"]
        if goal_type == "study":
            return ["Collect Material", "Summarize", "Practice", "Review", "Final Prep"]
        if goal_type == "business":
            return ["Market Review", "Risk Analysis", "Strategy", "Validation", "Launch Plan"]
        return ["Clarify", "Plan", "Execute", "Review"]

    def tasks_for_goal(self, goal_type: str) -> list[dict]:
        templates = {
            "software_project": [
                ("Define MVP scope", "Discovery", "Clarify users, core features, and success criteria.", "Strategy Agent", False, False),
                ("Design architecture", "Architecture", "Map frontend, backend, data, APIs, and safety constraints.", "Architecture Agent", False, False),
                ("Create implementation plan", "Implementation", "Break the feature set into safe coding tasks.", "Code Review Agent", True, True),
                ("Run tests and build", "Testing", "Verify the project with allowed test/build commands.", "Testing Agent", True, True),
                ("Prepare demo script", "Demo", "Create a concise demo flow and talking points.", "Writing Agent", False, False),
            ],
            "career": [
                ("Review current materials", "Profile Review", "Identify strengths, gaps, and target role fit.", "Resume Agent", False, False),
                ("Extract target keywords", "Keyword Targeting", "Find role-specific keywords and missing evidence.", "Resume Agent", False, False),
                ("Rewrite resume sections", "Rewrite", "Improve bullets, project descriptions, and summary.", "Writing Agent", False, False),
                ("Check risks and claims", "Proofread", "Remove weak claims and improve clarity.", "Risk Agent", False, False),
                ("Create application checklist", "Apply", "Prepare final application steps.", "Strategy Agent", False, False),
            ],
            "study": [
                ("Collect key materials", "Collect Material", "Gather files, notes, recordings, and topics.", "File Summary Agent", False, False),
                ("Create study notes", "Summarize", "Summarize core concepts and definitions.", "Study Notes Agent", False, False),
                ("Generate practice questions", "Practice", "Create Q&A and practice prompts.", "Study Notes Agent", False, False),
                ("Find weak areas", "Review", "Identify topics that need more review.", "Risk Agent", False, False),
            ],
            "business": [
                ("Define business concept", "Market Review", "Clarify customer, offer, and market.", "Business Analyst Agent", False, False),
                ("Analyze risks", "Risk Analysis", "Find assumptions, constraints, and failure modes.", "Risk Agent", False, False),
                ("Create strategy", "Strategy", "Define next steps and validation plan.", "Startup Strategy Agent", False, False),
                ("Plan validation", "Validation", "List experiments and success metrics.", "Strategy Agent", False, False),
            ],
            "general": [
                ("Clarify objective", "Clarify", "Define the exact outcome and constraints.", "Research Agent", False, False),
                ("Break into tasks", "Plan", "Create concrete steps and dependencies.", "Strategy Agent", False, False),
                ("Execute first step", "Execute", "Run the highest-priority next task.", "Strategy Agent", False, False),
                ("Review result", "Review", "Evaluate quality and identify improvements.", "Judge Agent", False, False),
            ],
        }
        rows = templates.get(goal_type, templates["general"])
        tasks = []
        previous_id: str | None = None
        for index, (title, phase, description, agent, requires_approval, automation_supported) in enumerate(rows):
            task_id = str(uuid4())
            tasks.append(
                {
                    "task_id": task_id,
                    "title": title,
                    "description": description,
                    "phase": phase,
                    "status": "pending",
                    "priority": "high" if index == 0 else "medium",
                    "depends_on": [previous_id] if previous_id else [],
                    "recommended_agent": agent,
                    "estimated_effort": "small" if index == 0 else "medium",
                    "requires_approval": requires_approval,
                    "automation_supported": automation_supported,
                }
            )
            previous_id = task_id
        return tasks

    @staticmethod
    def recommended_agents(goal_type: str) -> list[str]:
        mapping = {
            "software_project": ["Strategy Agent", "Code Review Agent", "Testing Agent", "Writing Agent"],
            "career": ["Resume Agent", "Writing Agent", "Risk Agent", "Strategy Agent"],
            "study": ["File Summary Agent", "Study Notes Agent", "Strategy Agent"],
            "business": ["Business Analyst Agent", "Risk Agent", "Startup Strategy Agent"],
            "general": ["Research Agent", "Strategy Agent", "Judge Agent"],
        }
        return mapping.get(goal_type, mapping["general"])

    @staticmethod
    def risk_level(user_input: str, goal_type: str) -> str:
        lowered = user_input.lower()
        if goal_type == "software_project" and any(word in lowered for word in ("payment", "auth", "delete", "production")):
            return "high"
        if goal_type in {"software_project", "business"}:
            return "medium"
        return "low"
