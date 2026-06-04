from pydantic import BaseModel, Field


class RunRequest(BaseModel):
    user_input: str = Field(..., min_length=1, description="The task the user wants agents to solve.")
    task_type: str = Field(default="auto", description="auto, resume, coding, business, research, finance, pharmacy, image_generation, system_explanation, app_automation, recording_summary, document_analysis, file_summary, resume_review, code_review, data_analysis, or general")
    deep_mode: bool = Field(default=False, description="Run optional multi-model consensus candidates.")
    session_id: str | None = Field(default=None, description="Existing chat session ID. Omit to create a new session.")
    file_ids: list[str] = Field(default_factory=list, description="Uploaded file IDs to include as context.")
    recording_ids: list[str] = Field(default_factory=list, description="Uploaded recording IDs to include as transcript context.")
    voice_used: bool = Field(default=False, description="Whether the request came from browser voice transcription.")
    voice_transcript: str | None = Field(default=None, description="Browser-transcribed voice command text, if used.")


class RenameChatRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=80)


class CreateChatRequest(BaseModel):
    title: str | None = Field(default=None, max_length=80)


class FeedbackRequest(BaseModel):
    session_id: str
    message_id: str
    run_id: str
    rating: str = Field(..., pattern="^(helpful|not_helpful|saved)$")
    comment: str | None = Field(default=None, max_length=1000)


class AutomationApplyRequest(BaseModel):
    run_id: str
    approved: bool


class PromptProposalRequest(BaseModel):
    agent_name: str = Field(..., min_length=1, max_length=80)
    reason: str = Field(..., min_length=1, max_length=1000)
    proposed_prompt: str = Field(..., min_length=1, max_length=8000)


class PromptDecisionRequest(BaseModel):
    agent_name: str = Field(..., min_length=1, max_length=80)
    version_id: str = Field(..., min_length=1, max_length=80)
