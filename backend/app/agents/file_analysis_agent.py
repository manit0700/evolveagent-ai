from app.models.response_models import AgentOutput, FileSummary
from app.services.file_service import CODE_EXTENSIONS


class FileAnalysisAgent:
    name = "File Analysis Agent"

    def run(self, files_used: list[dict], file_context: str, user_input: str) -> tuple[AgentOutput, FileSummary]:
        extensions = sorted({item.get("extension", "").lstrip(".") for item in files_used if item.get("extension")})
        recommended = self.recommended_workflow(files_used, user_input)
        key_points = self.extract_key_points(file_context)
        summary = self.summary_text(files_used, recommended, file_context)
        file_summary = FileSummary(
            summary=summary,
            key_points=key_points,
            file_types=extensions,
            recommended_workflow=recommended,
        )
        output = AgentOutput(
            agent_name=self.name,
            provider="rule-based",
            model="file-analysis-v1",
            output=(
                f"{summary}\n\n"
                f"Recommended workflow: {recommended}\n"
                f"Key points: {', '.join(key_points) if key_points else 'No key points extracted.'}"
            ),
        )
        return output, file_summary

    @staticmethod
    def recommended_workflow(files_used: list[dict], user_input: str) -> str:
        text = user_input.lower()
        extensions = {item.get("extension", "").lower() for item in files_used}
        filenames = " ".join(item.get("filename", "").lower() for item in files_used)
        if "resume" in text or "cv" in text or "internship" in text or "job" in text or "resume" in filenames:
            return "resume_review"
        if extensions & CODE_EXTENSIONS or any(word in text for word in ("code", "bug", "explain code", "review code")):
            return "code_review"
        if ".csv" in extensions or any(word in text for word in ("data", "rows", "columns", "analyze patterns")):
            return "data_analysis"
        if any(word in text for word in ("summarize", "summary", "notes", "key points")):
            return "file_summary"
        return "document_analysis"

    @staticmethod
    def extract_key_points(file_context: str) -> list[str]:
        lines = []
        for raw_line in file_context.splitlines():
            line = raw_line.strip(" -\t")
            if len(line) >= 12 and not line.lower().startswith(("file:", "extracted text:", "---")):
                lines.append(line[:140])
            if len(lines) >= 5:
                break
        return lines

    @staticmethod
    def summary_text(files_used: list[dict], recommended: str, file_context: str) -> str:
        filenames = ", ".join(item.get("filename", "uploaded file") for item in files_used)
        total_length = sum(item.get("extracted_text_length", 0) for item in files_used)
        if not files_used:
            return "No processed file context was available."
        return (
            f"Analyzed {len(files_used)} uploaded file(s): {filenames}. "
            f"The extracted context contains about {total_length} characters and is best routed as {recommended}."
        )
