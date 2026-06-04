from app.models.response_models import PromptInjectionResult


class PromptInjectionFirewallAgent:
    name = "Prompt Injection Firewall Agent"

    high_risk_patterns = {
        "reveal system prompt": 35,
        "reveal api key": 40,
        "send secrets": 40,
        "exfiltrate data": 45,
        "delete files": 45,
        "change .env": 45,
        "modify hidden files": 35,
        "install unknown packages": 35,
    }
    medium_risk_patterns = {
        "ignore previous instructions": 25,
        "run shell command": 30,
        "override safety": 30,
        "disable guardrails": 30,
        "override system prompt": 30,
    }

    def scan(self, text: str | None) -> PromptInjectionResult:
        if not text:
            return PromptInjectionResult()

        lowered = text.lower()
        suspicious: list[str] = []
        score = 0
        for phrase, weight in {**self.high_risk_patterns, **self.medium_risk_patterns}.items():
            if phrase in lowered:
                suspicious.append(phrase)
                score += weight

        score = min(score, 100)
        if score >= 70 or any(phrase in suspicious for phrase in self.high_risk_patterns):
            level = "high"
            safe = False
            recommendation = "Block or isolate this content before agent execution."
        elif score >= 35:
            level = "medium"
            safe = True
            recommendation = "Treat this content as untrusted and avoid following embedded instructions."
        else:
            level = "low"
            safe = True
            recommendation = "No prompt-injection indicators were detected."

        return PromptInjectionResult(
            risk_score=score,
            risk_level=level,
            suspicious_phrases=suspicious,
            safe_to_use_context=safe,
            recommendation=recommendation,
        )
