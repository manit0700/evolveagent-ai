from pydantic import BaseModel, Field


class AgentOutput(BaseModel):
    agent_name: str
    provider: str = "mock"
    model: str = "mock-agent-model"
    latency_ms: int = 0
    success: bool = True
    fallback_used: bool = False
    error: str | None = None
    output: str


class AgentEvaluation(BaseModel):
    agent_name: str
    usefulness_score: int
    clarity_score: int
    contribution_summary: str
    weakness: str
    improvement_suggestion: str


class JudgeResult(BaseModel):
    overall_score: int
    strengths: list[str]
    weaknesses: list[str]
    recommendation: str
    per_agent_scores: list[AgentEvaluation] = []
    strongest_agent: str | None = None
    weakest_agent: str | None = None
    workflow_strengths: list[str] = []
    workflow_weaknesses: list[str] = []
    classification_correct: bool | None = None
    capability_supported: bool | None = None
    reason: str | None = None
    provider: str = "rule-based"
    model: str = "rule-based-judge"
    latency_ms: int = 0
    success: bool = True
    fallback_used: bool = False
    error: str | None = None


class MasterPlan(BaseModel):
    detected_task_type: str
    confidence: int
    selected_agents: list[str]
    suggested_future_agents: list[str]
    execution_order: list[str]
    selection_reason: str
    retry_policy: str


class WorkflowStep(BaseModel):
    step: int
    stage: str
    agent_name: str
    status: str
    summary: str


class PromptInjectionResult(BaseModel):
    risk_score: int = 0
    risk_level: str = "low"
    suspicious_phrases: list[str] = Field(default_factory=list)
    safe_to_use_context: bool = True
    recommendation: str = "No prompt-injection indicators were detected."


class SecretScanResult(BaseModel):
    status: str = "passed"
    secrets_detected: bool = False
    redaction_count: int = 0
    detected_types: list[str] = Field(default_factory=list)
    recommendation: str = "No secrets were detected."


class QualityGates(BaseModel):
    prompt_injection_check: str = "passed"
    secret_scan: str = "passed"
    permission_check: str = "passed"
    file_context_check: str = "not_used"


class GovernanceEvent(BaseModel):
    run_id: str | None = None
    session_id: str | None = None
    task_type: str | None = None
    agent_name: str = "Security Governance Layer"
    action_type: str
    tool_used: str | None = None
    files_accessed: list[str] = Field(default_factory=list)
    command_requested: str | None = None
    permission_level: str = "read_only"
    approved: bool = False
    blocked: bool = False
    risk_score: int = 0
    reason: str = ""
    created_at: str | None = None


class SecurityReport(BaseModel):
    prompt_injection: PromptInjectionResult = Field(default_factory=PromptInjectionResult)
    secret_scan: SecretScanResult = Field(default_factory=SecretScanResult)
    permission_level: str = "read_only"
    risk_score: int = 0
    risk_level: str = "low"
    recommendation: str = "Security checks passed."
    blocked: bool = False


class ProviderStatus(BaseModel):
    llm_mode: str
    openai_configured: bool
    anthropic_configured: bool
    gemini_configured: bool
    mistral_configured: bool
    default_provider: str
    available_providers: list[str]


class ImageResult(BaseModel):
    image_url: str
    prompt: str
    original_prompt: str | None = None
    provider: str = "mock_image"
    model: str = "mock-image-generator"
    fallback_used: bool = False
    fallback_error: str | None = None
    safety_rewritten: bool = False


class FileUsed(BaseModel):
    file_id: str
    filename: str
    content_type: str | None = None
    extension: str
    size_bytes: int
    extracted_text_length: int = 0


class FileSummary(BaseModel):
    summary: str
    key_points: list[str] = []
    file_types: list[str] = []
    recommended_workflow: str = "document_analysis"


class RecordingUsed(BaseModel):
    recording_id: str
    filename: str
    content_type: str | None = None
    extension: str
    size_bytes: int
    transcript_length: int = 0
    provider: str = "mock"
    model: str = "mock-transcription"
    fallback_used: bool = False


class RecordingSummary(BaseModel):
    short_summary: str
    detailed_summary: str
    key_points: list[str] = []
    action_items: list[str] = []
    decisions: list[str] = []
    follow_up_tasks: list[str] = []
    study_notes: list[str] = []
    qa: list[dict] = []


class ProjectScanResult(BaseModel):
    frameworks_detected: list[str] = []
    package_manager: str | None = None
    relevant_files: list[str] = []
    build_commands: list[str] = []
    test_commands: list[str] = []
    scan_summary: str = ""


class AutomationPlan(BaseModel):
    summary: str
    files_to_change: list[str] = []
    files_to_create: list[str] = []
    commands_to_run: list[str] = []
    risk_level: str = "low"
    requires_approval: bool = True
    notes: list[str] = []
    project_scan: ProjectScanResult | None = None
    consensus_candidates: list[dict] = []
    judge_reason: str | None = None


class CommandResult(BaseModel):
    command: str
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    success: bool = False


class AutomationApplyResult(BaseModel):
    success: bool
    changed_files: list[str] = []
    created_files: list[str] = []
    command_results: list[CommandResult] = []
    errors: list[str] = []
    summary: str = ""


class RunResponse(BaseModel):
    task_id: str
    run_id: str
    session_id: str
    message_id: str
    task_type: str
    agents_used: list[str]
    suggested_agents: list[str] = []
    master_plan: MasterPlan
    workflow_trace: list[WorkflowStep]
    agent_outputs: list[AgentOutput]
    consensus_candidates: list[AgentOutput] = []
    consensus_winner: str | None = None
    consensus_judge_reason: str | None = None
    consensus_disagreement_notes: list[str] = []
    judge_result: JudgeResult
    evolution_notes: list[str]
    memory_saved: bool
    file_context_used: bool = False
    files_used: list[FileUsed] = []
    file_summary: FileSummary | None = None
    file_context_characters: int = 0
    recording_context_used: bool = False
    recordings_used: list[RecordingUsed] = []
    transcript_preview: str | None = None
    recording_summary: RecordingSummary | None = None
    action_items: list[str] = []
    decisions: list[str] = []
    image_result: ImageResult | None = None
    requires_approval: bool = False
    automation_plan: AutomationPlan | None = None
    automation_status: str | None = None
    automation_apply_result: AutomationApplyResult | None = None
    quality_gates: QualityGates = Field(default_factory=QualityGates)
    security_report: SecurityReport = Field(default_factory=SecurityReport)
    governance_events: list[GovernanceEvent] = Field(default_factory=list)
    voice_used: bool = False
    voice_transcript: str | None = None
    final_output: str
    created_at: str
