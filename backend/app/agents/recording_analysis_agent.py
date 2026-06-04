from app.models.response_models import AgentOutput, RecordingSummary


class RecordingAnalysisAgent:
    name = "Recording Analysis Agent"

    def run(self, recordings_used: list[dict], transcript_context: str, user_input: str) -> tuple[AgentOutput, RecordingSummary]:
        key_points = self.extract_points(transcript_context)
        action_items = self.extract_action_items(transcript_context)
        decisions = self.extract_decisions(transcript_context)
        filename_text = ", ".join(item.get("filename", "recording") for item in recordings_used)
        mode = self.notes_mode(user_input)
        summary = RecordingSummary(
            short_summary=f"Analyzed {len(recordings_used)} recording(s): {filename_text}.",
            detailed_summary=(
                f"The transcript was prepared as {mode}. It covers the main discussion, decisions, "
                "action items, and follow-up tasks found in the recording context."
            ),
            key_points=key_points,
            action_items=action_items,
            decisions=decisions,
            follow_up_tasks=action_items[:3],
            study_notes=[
                f"Review: {point}" for point in key_points[:4]
            ],
            qa=[
                {"question": "What was the recording about?", "answer": key_points[0] if key_points else "The recording needs more transcript detail."},
                {"question": "What should happen next?", "answer": action_items[0] if action_items else "No explicit action item was found."},
            ],
        )
        output = AgentOutput(
            agent_name=self.name,
            provider="rule-based",
            model="recording-analysis-v1",
            output=(
                f"{summary.short_summary}\n\n{summary.detailed_summary}\n\n"
                f"Key points: {', '.join(summary.key_points) if summary.key_points else 'None found.'}\n"
                f"Action items: {', '.join(summary.action_items) if summary.action_items else 'None found.'}\n"
                f"Decisions: {', '.join(summary.decisions) if summary.decisions else 'None found.'}"
            ),
        )
        return output, summary

    @staticmethod
    def notes_mode(user_input: str) -> str:
        text = user_input.lower()
        if "lecture" in text or "study" in text or "class" in text:
            return "lecture/study notes"
        if "meeting" in text or "decision" in text or "action" in text:
            return "meeting notes"
        return "recording summary"

    @staticmethod
    def extract_points(transcript_context: str) -> list[str]:
        points = []
        for raw in transcript_context.replace(". ", ".\n").splitlines():
            line = raw.strip(" -\t")
            if len(line) >= 24 and not line.lower().startswith(("recording:", "transcript:", "---")):
                points.append(line[:160])
            if len(points) >= 6:
                break
        return points

    @staticmethod
    def extract_action_items(transcript_context: str) -> list[str]:
        actions = []
        for raw in transcript_context.split("."):
            sentence = raw.strip()
            if any(word in sentence.lower() for word in ("action item", "follow-up", "follow up", "next step", "task")):
                actions.append(sentence[:160])
            if len(actions) >= 5:
                break
        return actions or ["Review the transcript summary and confirm the next steps."]

    @staticmethod
    def extract_decisions(transcript_context: str) -> list[str]:
        decisions = []
        for raw in transcript_context.split("."):
            sentence = raw.strip()
            if any(word in sentence.lower() for word in ("decision", "decided", "approved", "agreed")):
                decisions.append(sentence[:160])
            if len(decisions) >= 5:
                break
        return decisions or ["No explicit decision was detected in the transcript."]
