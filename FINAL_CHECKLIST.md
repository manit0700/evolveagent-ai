# EvolveAgent AI MVP v2.5 — Final Checklist

## Verification Commands

Backend tests:

```bash
cd backend
pytest
```

Frontend build:

```bash
cd frontend
npm run build
```

## Manual Demo Test Prompts

- `Explain how EvolveAgent AI works.`
- Turn on Deep Mode and ask: `Compare the best plan for improving this project demo.`
- `Add dark mode to this app.`
- `Run tests for this project.`
- `Explain the current app architecture.`
- Upload a document and ask: `Summarize this uploaded document.`
- Upload a recording and ask: `Summarize this recording and list action items.`
- Upload a lecture recording and ask: `Turn this lecture recording into study notes.`
- `Generate an image prompt for a futuristic AI assistant.`
- `Review my FastAPI backend architecture.`
- `Create a 2-minute project demo script.`
- `Build an AI resume analyzer app.`
- `Create a full implementation plan for a SaaS app.`
- `Break this goal into tasks.`

## Manual Demo Checks

- Simple Mode shows clean chat answers.
- Developer Mode shows workflow trace, judge score, per-agent evaluation, automation plan, learning report, and raw JSON.
- Developer Mode Learning Report shows task-specific agent insights, workflow recommendations, model routing recommendations, user preferences, and prompt version controls.
- Developer Mode shows consensus candidates, selected winner, and provider/model metadata when Deep Mode is used.
- Provider status endpoint shows configured OpenAI, Claude, Gemini, Mistral, and mock providers.
- Deep Mode returns `consensus_candidates`, `consensus_winner`, and `consensus_judge_reason`.
- Mock fallback still works when provider keys are missing or provider calls fail.
- Simple Mode hides provider/model, judge score, workflow trace, and consensus metadata.
- Voice input button appears near the composer.
- Browser voice input fills the text box when supported.
- App automation request returns an approval plan before apply.
- Rejecting automation does not change files.
- File upload shows attached file chips and file-aware answer.
- Recording upload shows recording chips and recording-aware answer.
- Developer Mode shows transcript preview, provider/model, action items, and decisions.
- Mock image request shows image preview and prompt.
- Feedback buttons save helpful/not helpful/saved ratings.
- Analytics panel shows run and feedback metrics.
- Export Markdown/JSON works.
- Mission Control shows goals, progress, task cards, run task, and mark done controls.
- Goal planning creates a saved task graph.
- Custom Agent Builder lists templates and can create an agent from a template.
- Developer Mode shows goal/task metadata and custom agent metadata.

## Automation Safety Checklist

- File edits require explicit approval.
- Command execution is allowlisted only.
- Allowed commands: `npm run build`, `npm test`, `npm run lint`, `pytest`, `python -m pytest`.
- Destructive file deletion is not supported.
- Unrestricted shell execution is not supported.
- Package installation is not supported through automation.
- `.env` editing is blocked.
- `.git`, `node_modules/`, `venv/`, uploads, and local data/analytics files are blocked.
- Prompt/workflow/model learning proposes changes only.
- Prompt versions require approval and can be rolled back.
- The app does not silently self-modify.
- The base LLM is not retrained or fine-tuned by the app.

## Files to Avoid Committing

- `.env`
- `venv/`
- `node_modules/`
- `dist/`
- `__pycache__/`
- `.pytest_cache/`
- `backend/app/uploads/`
- `backend/app/uploads/extracted/`
- `backend/app/data/files.json`
- `backend/app/data/feedback.json`
- `backend/app/data/agent_analytics.json`
- `backend/app/data/automation_runs.json`
- `backend/app/data/automation_logs.json`
- `backend/app/data/learning_memory.json`
- `backend/app/data/model_performance.json`
- `backend/app/data/goals.json`
- `backend/app/data/task_graphs.json`
- `backend/app/data/custom_agents.json`
- local logs
- private uploaded documents

## Environment Variable Safety Checklist

- Confirm `.env` is ignored.
- Do not commit API keys.
- Use `.env.example` or README examples for configuration.
- Keep `IMAGE_MODE=mock` for MVP v2.5.
- Use `TRANSCRIPTION_MODE=mock` for demos without real transcription cost.
- Use `TRANSCRIPTION_MODE=openai` only when `OPENAI_API_KEY` is configured.
- Use `LLM_MODE=mock` for demos without API keys.
- Use `LLM_MODE=real` with whichever provider keys are configured.
- Optional consensus keys are `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and `MISTRAL_API_KEY`.

## Final GitHub Cleanup Checklist

- README is updated to MVP v2.5.
- DEMO.md includes voice and app automation demo flow.
- DEMO.md includes recording intelligence demo flow.
- DEMO.md includes Mission Control and Custom Agent Builder demo flow.
- FINAL_PROJECT_SUMMARY.md exists and reflects v2.5.
- FINAL_CHECKLIST.md exists and reflects v2.5.
- screenshots/README.md includes screenshot instructions if screenshots are not committed.
- Backend tests pass.
- Frontend build passes.
- No API keys are committed.
- No uploaded private files are committed.
- No generated build output is committed.
- No local logs are committed.
- Simple Mode is clean.
- Developer Mode shows workflow, automation, and learning details.
- Analytics panel works.
- Feedback buttons work.
