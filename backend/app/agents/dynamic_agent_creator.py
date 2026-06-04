class DynamicAgentCreator:
    name = "Dynamic Agent Creator"

    SUGGESTIONS = {
        "resume": ["ATS Keyword Agent", "Resume Match Agent"],
        "coding": ["Code Review Agent", "Testing Agent"],
        "business": ["Market Sizing Agent", "Competitor Analysis Agent"],
        "finance": ["Sentiment Agent", "Scenario Risk Agent"],
        "pharmacy": ["ICD Agent", "Criteria Agent"],
        "research": ["Source Quality Agent", "Evidence Summary Agent"],
        "system_explanation": ["Architecture Explainer Agent", "Workflow Trace Agent"],
        "image_generation": ["Image Agent", "Image Prompt Builder"],
        "general": ["Clarification Agent"],
    }

    def suggest(self, task_type: str) -> list[str]:
        return self.SUGGESTIONS.get(task_type, self.SUGGESTIONS["general"])
