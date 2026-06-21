from __future__ import annotations

from typing import Any

from app.models.response_models import GovernanceEvent
from app.services.governance_service import GovernanceService
from app.services.storage_service import StorageService
from app.services.workspace_service import WorkspaceService


class ResearchSearchService:
    def __init__(
        self,
        storage: StorageService,
        workspace_service: WorkspaceService,
        governance_service: GovernanceService,
        research_session_service: Any,
    ):
        self.storage = storage
        self.workspace_service = workspace_service
        self.governance = governance_service
        self.research_session_service = research_session_service

    def search(
        self,
        query: str,
        workspace_id: str | None = None,
        max_results: int = 5,
    ) -> dict:
        resolved_workspace = self.workspace_service.resolve_workspace_id(workspace_id)

        # Log: research_search_requested
        self._log(
            action_type="research_search_requested",
            query=query,
            workspace_id=resolved_workspace,
            reason=f"Controlled mock search requested for query: '{query}'",
            risk_score=5,
        )

        q_lower = query.lower()
        mock_candidates = []

        if "api" in q_lower or "image" in q_lower or "provider" in q_lower:
            mock_candidates = [
                {
                    "title": "OpenAI Image Generation Docs",
                    "url": "https://openai.com/api/images",
                    "publisher": "OpenAI",
                    "snippet": "Official documentation for OpenAI image generation provider configuration, API capabilities, and usage details.",
                },
                {
                    "title": "Google Vertex AI API Documentation",
                    "url": "https://google.com/vertex-ai",
                    "publisher": "Google",
                    "snippet": "Guides and references for Vertex AI platform API endpoints, models, and real-time generation options.",
                },
                {
                    "title": "Anthropic Claude API Integration Details",
                    "url": "https://anthropic.com/claude/api",
                    "publisher": "Anthropic",
                    "snippet": "Integration schemas and developer references for connecting to Claude model family endpoints safely.",
                },
                {
                    "title": "Unsecured API Blog post",
                    "url": "http://medium.com/api-trends/unsecured-endpoints",
                    "publisher": "TechTrends Blog",
                    "snippet": "A casual article highlighting unsecured API endpoints and common developer mistakes.",
                },
            ]
        elif "security" in q_lower or "governance" in q_lower or "risk" in q_lower:
            mock_candidates = [
                {
                    "title": "Microsoft Cloud Governance & Security Policies",
                    "url": "https://microsoft.com/azure/security",
                    "publisher": "Microsoft",
                    "snippet": "Comprehensive policies, controls, and compliance frameworks for secure cloud deployment and management.",
                },
                {
                    "title": "GitHub Security Blog Post on Supply Chain Risks",
                    "url": "https://github.com/blog/security/supply-chain-risks",
                    "publisher": "GitHub Security Team",
                    "snippet": "Discussion and guidelines concerning supply chain attack vectors and automated dependency scanning.",
                },
                {
                    "title": "NIH Guideline on Healthcare Software Safety",
                    "url": "https://nih.gov/health-topics/software-safety",
                    "publisher": "National Institutes of Health",
                    "snippet": "Federal guidance on healthcare information system safety and clinical software governance protocols.",
                },
            ]
        else:
            mock_candidates = [
                {
                    "title": "World Health Organization Emergency Guidelines",
                    "url": "http://who.int/emergencies/guidelines",
                    "publisher": "World Health Organization",
                    "snippet": "Global guidelines outlining responses and procedures during international public health emergencies.",
                },
                {
                    "title": "National Institutes of Health Overview",
                    "url": "https://nih.gov/about-nih",
                    "publisher": "National Institutes of Health",
                    "snippet": "General information and resources about NIH funding, scientific research programs, and healthcare facts.",
                },
                {
                    "title": "Google Research Index",
                    "url": "https://google.com/search/research",
                    "publisher": "Google",
                    "snippet": "Database of peer-reviewed research papers and publications from Google research teams globally.",
                },
            ]

        # Limit by max_results
        selected = mock_candidates[: min(max_results, 10)]
        results = []
        for item in selected:
            # Score using existing logic
            score, _ = self.research_session_service.score_source(item)
            if score >= 70:
                label = "high"
            elif score >= 45:
                label = "medium"
            else:
                label = "low"

            results.append(
                {
                    "title": item["title"],
                    "url": item["url"],
                    "publisher": item["publisher"],
                    "snippet": item["snippet"],
                    "credibility_score": score,
                    "credibility_label": label,
                }
            )

        search_res = {
            "query": query,
            "provider": "mock_research_search",
            "results": results,
            "external_fetch_used": False,
            "safety_notes": ["No external search APIs were called. Mock database queries only."],
        }

        # Log: research_search_completed
        self._log(
            action_type="research_search_completed",
            query=query,
            workspace_id=resolved_workspace,
            reason=f"Controlled mock search completed successfully. Returned {len(results)} source candidates.",
            risk_score=5,
        )

        return search_res

    def log_sources_added(
        self,
        research_id: str,
        query: str,
        workspace_id: str | None,
        num_sources: int,
    ) -> None:
        self.governance.log_event(
            GovernanceEvent(
                run_id=research_id,
                workspace_id=workspace_id,
                task_type="research",
                agent_name="Research Governance Agent",
                action_type="research_session_sources_added",
                tool_used="mock_research_search",
                permission_level="read_only",
                approved=False,
                blocked=False,
                risk_score=10,
                reason=f"Added {num_sources} sources from controlled search for query '{query}' to research session {research_id}.",
            )
        )

    def _log(
        self,
        action_type: str,
        query: str,
        workspace_id: str | None,
        reason: str,
        risk_score: int,
    ) -> None:
        self.governance.log_event(
            GovernanceEvent(
                run_id=None,
                workspace_id=workspace_id,
                task_type="research",
                agent_name="Research Governance Agent",
                action_type=action_type,
                tool_used="mock_research_search",
                permission_level="read_only",
                approved=False,
                blocked=False,
                risk_score=risk_score,
                reason=reason,
            )
        )
