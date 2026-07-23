# EvolveAgent AI Agent Instructions

These instructions apply to Antigravity CLI, Gemini-style agents, Codex, Cursor Agent, and any other AI coding worker operating in this repository.

## Project Context

- Repo path: `/Users/manitdankhara/evolveagent-ai` (cloud agents may mount at `/workspace`)
- Product: EvolveAgent AI, a FastAPI + React multi-agent AI workspace.
- Current focus: continue roadmap work safely without breaking existing chat, files, recordings, image, governance, learning, Linear, and research workflows.
- Active UI direction: **light calm web** + **dark denser desktop** via shared EA tokens (`frontend/src/styles/ea-theme.css`, `data-platform` in `main.jsx`). Desktop is a Tauri wrapper only — see `docs/FRONTEND_DESKTOP_UI.md`.

## Hard Safety Rules

- Never print, copy, commit, or expose secrets.
- Never edit or stage:
  - `.env`
  - `backend/.env`
  - `.git/`
  - `node_modules/`
  - `venv/`
  - `__pycache__/`
  - `backend/app/data/`
  - `backend/app/uploads/`
  - build/cache/log output
- Never run destructive commands such as `git reset --hard`, `git checkout -- .`, `rm -rf`, force push, or file deletion unless the user explicitly requests it.
- Never bypass the existing permission, governance, secret-scanning, safe-file-editor, or safe-command-runner systems.
- Do not add authentication, payments, deployment, Docker, database migrations, vector DB, unrestricted shell execution, or real external integrations unless the current task explicitly asks for them.

## Before Editing

Run:

```bash
git status --short
git branch --show-current
```

If the working tree has unrelated changes, leave them alone. Work only with files required for the task.

## Multi-Agent Working Style

Do not treat substantial work as a single default-agent pass. For non-trivial tasks, use this internal multi-role workflow:

1. **Planner Agent**: inspect requirements, identify affected files, define the smallest safe implementation plan.
2. **Backend Agent**: handle FastAPI routes, services, agents, storage, governance, tests.
3. **Frontend Agent**: handle React UI, `frontend/src/api.js`, Simple Mode/Developer Mode behavior.
4. **Security/Governance Agent**: check protected paths, secret exposure, permission rules, unsafe commands, runtime data.
5. **Testing Agent**: run focused tests, then full backend tests and frontend build when needed.
6. **Reviewer Agent**: review the final diff for regressions, unrelated changes, missing tests, and unsafe files before commit.

If the AI tool supports real sub-agents, use them. If it only supports one active agent, simulate these roles sequentially and report each role's findings before editing or committing.

Do not use every role for tiny edits. For small documentation or one-line fixes, use Planner + Reviewer only.

## Repo Structure

- `backend/`: FastAPI backend.
- `backend/app/api/routes.py`: API route definitions. Keep routes thin.
- `backend/app/services/`: business logic and storage/service layers.
- `backend/app/agents/`: agent logic.
- `backend/app/models/`: Pydantic request/response models.
- `backend/tests/`: backend pytest suite.
- `frontend/`: React frontend (active app is `App.tsx`, not legacy `App.jsx`).
- `frontend/src/App.tsx`: main UI shell.
- `frontend/src/api.js`: frontend API client helpers.
- `frontend/src/styles/ea-theme.css`: web/desktop design tokens.
- `frontend/src/components/layout/`: Sidebar + TopBar shell.
- `frontend/src/components/shared/`: GlassCard, PageHero, modals, badges.
- `desktop/`: Tauri v2 wrapper around the same frontend (no separate React tree).
- `.cursor/rules/`: Cursor agent rules for workflow + UI system.

## Backend Conventions

- Keep route handlers small; put logic in services.
- Use existing services before creating new ones.
- Use `StorageService` for JSON-backed persistence.
- Keep runtime JSON files out of Git.
- For stateful or risky actions, log governance events through `GovernanceService`.
- For file edits, use `SafeFileEditor`.
- For commands, use `SafeCommandRunner` and only allow existing allowlisted commands.
- External API behavior must preserve mock fallback and should not crash when keys are missing.

## Frontend Conventions

- Active shell is `frontend/src/App.tsx` (legacy `App.jsx` is not the mounted entry).
- Preserve Simple Mode as clean user-facing chat.
- Show technical details only in Developer Mode or details panels.
- Do not leak provider keys, raw secrets, internal paths, or raw security internals in Simple Mode.
- Keep UI changes scoped. Avoid broad redesigns unless the task is specifically a UI redesign.
- Prefer EA tokens (`ea-card`, `ea-btn`, `ea-hero`, CSS vars) over hardcoded dark glass / cyan-purple glow.
- Web must stay light/calm; desktop (`data-platform="desktop"`) must stay darker and denser — do not make them identical.
- TopBar should stay a quiet productivity header; Sidebar should stay sectioned and useful, not flashy.

## Testing

Backend:

```bash
cd backend
./venv/bin/pytest -q
```

Frontend:

```bash
cd frontend
npm run build
```

Run focused tests first for the changed area, then full tests/build before committing.

## Git Rules

- Commit only intended source, test, and documentation files.
- Do not stage runtime JSON, uploads, `.env`, `node_modules`, `venv`, logs, or cache.
- Use clear commit messages tied to Linear issue IDs when applicable, for example:

```text
EVO-277: add governed research agent foundation
```

- Push only after tests/build pass, unless the user explicitly asks for a work-in-progress push.

## Linear Workflow

- Linear API credentials must stay in `backend/.env`; never print them.
- Use local backend endpoints for Linear updates when possible.
- Mark Linear issues Done only after the relevant branch/PR is merged or the user explicitly confirms completion.
- If local Linear cache is stale, sync the issue rather than editing runtime JSON manually.

## Response Expectations

When finishing a task, report:

- branch
- files changed
- commit hash if committed
- backend test result
- frontend build result
- Linear status if updated
- known limitations or follow-up
