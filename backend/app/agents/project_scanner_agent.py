from pathlib import Path

from app.models.response_models import ProjectScanResult


class ProjectScannerAgent:
    name = "Project Scanner Agent"

    ignored_names = {
        ".env",
        ".git",
        "node_modules",
        "venv",
        "__pycache__",
        ".pytest_cache",
        "dist",
        "build",
    }
    ignored_paths = {
        "backend/app/uploads",
        "backend/app/uploads/extracted",
        "backend/app/data/files.json",
        "backend/app/data/feedback.json",
        "backend/app/data/agent_analytics.json",
    }

    def __init__(self, project_root: str | Path | None = None):
        self.project_root = Path(project_root) if project_root else Path(__file__).resolve().parents[3]

    def scan(self, user_input: str = "") -> ProjectScanResult:
        frameworks = self.detect_frameworks()
        package_manager = self.detect_package_manager()
        relevant_files = self.find_relevant_files(user_input)
        build_commands = ["npm run build"] if (self.project_root / "frontend" / "package.json").exists() else []
        test_commands = []
        if (self.project_root / "backend" / "tests").exists():
            test_commands.append("pytest")
        if (self.project_root / "frontend" / "package.json").exists():
            test_commands.append("npm test")

        return ProjectScanResult(
            frameworks_detected=frameworks,
            package_manager=package_manager,
            relevant_files=relevant_files,
            build_commands=build_commands,
            test_commands=test_commands,
            scan_summary=(
                f"Scanned {self.project_root.name}. Detected {', '.join(frameworks) or 'no known frameworks'} "
                f"and {package_manager or 'no package manager'}."
            ),
        )

    def detect_frameworks(self) -> list[str]:
        frameworks: list[str] = []
        if (self.project_root / "backend" / "app" / "main.py").exists():
            frameworks.append("FastAPI")
        package_json = self.project_root / "frontend" / "package.json"
        if package_json.exists():
            text = package_json.read_text(encoding="utf-8", errors="ignore").lower()
            if "vite" in text:
                frameworks.append("Vite")
            if "react" in text:
                frameworks.append("React")
        return frameworks

    def detect_package_manager(self) -> str | None:
        if (self.project_root / "frontend" / "pnpm-lock.yaml").exists():
            return "pnpm"
        if (self.project_root / "frontend" / "yarn.lock").exists():
            return "yarn"
        if (self.project_root / "frontend" / "package-lock.json").exists():
            return "npm"
        return None

    def find_relevant_files(self, user_input: str) -> list[str]:
        terms = {token.strip(".,:;()[]{}").lower() for token in user_input.split() if len(token) > 3}
        candidates: list[str] = []
        for path in self.project_root.rglob("*"):
            if len(candidates) >= 24:
                break
            if not path.is_file() or self.is_ignored(path):
                continue
            relative = path.relative_to(self.project_root).as_posix()
            if path.suffix.lower() not in {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".md", ".json"}:
                continue
            lower_relative = relative.lower()
            if not terms or any(term in lower_relative for term in terms):
                candidates.append(relative)

        if candidates:
            return candidates[:20]

        defaults = [
            "frontend/src/App.jsx",
            "frontend/src/styles.css",
            "backend/app/agents/master_agent.py",
            "backend/app/api/routes.py",
            "backend/app/models/request_models.py",
            "backend/app/models/response_models.py",
        ]
        return [item for item in defaults if (self.project_root / item).exists()]

    def is_ignored(self, path: Path) -> bool:
        parts = set(path.parts)
        if parts & self.ignored_names:
            return True
        relative = path.relative_to(self.project_root).as_posix()
        return any(relative == ignored or relative.startswith(f"{ignored}/") for ignored in self.ignored_paths)
