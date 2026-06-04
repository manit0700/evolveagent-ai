class LLMProvider:
    provider_name = "base"

    def generate(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        raise NotImplementedError
