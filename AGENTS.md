# EvolveAgent AI Agent Instructions

These instructions apply to Antigravity CLI, Gemini-style agents, Codex, Cursor Agent, and any other AI coding worker operating in this repository.

## Project Context

- Repo path: `/Users/manitdankhara/evolveagent-ai`
- Product: EvolveAgent AI, a FastAPI + React multi-agent AI workspace.
- Current focus: continue roadmap work safely without breaking existing chat, files, recordings, image, governance, learning, Linear, and research workflows.

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
- `frontend/`: React frontend.
- `frontend/src/App.jsx`: main UI.
- `frontend/src/api.js`: frontend API client helpers.

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

- Preserve Simple Mode as clean user-facing chat.
- Show technical details only in Developer Mode or details panels.
- Do not leak provider keys, raw secrets, internal paths, or raw security internals in Simple Mode.
- Keep UI changes scoped. Avoid broad redesigns unless the task is specifically a UI redesign.

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

## Cursor Cloud specific instructions

These notes are for cloud agents whose VM already had the startup update script run
(backend `venv` created + deps installed, frontend `node_modules` installed).

### Services (all run in offline mock/JSON mode by default — no API keys needed)

- Backend (FastAPI): from `backend/`, run `./venv/bin/uvicorn app.main:app --reload --port 8000`.
  Health check: `GET http://127.0.0.1:8000/health`. Chat endpoint is `POST /api/run` with body
  `{"user_input": "..."}` (note: the field is `user_input`, not `message`).
- Frontend (React + Vite): from `frontend/`, run `npm run dev -- --host 127.0.0.1 --port 5173`,
  then open `http://127.0.0.1:5173`. It defaults to the backend at `http://127.0.0.1:8000`
  (override with `VITE_API_BASE`), so run the backend on port 8000 to match.
- Root `npm run dev` starts backend on port 8001 (not 8000); if you use it, set
  `frontend/.env` `VITE_API_BASE=http://127.0.0.1:8001` to match. Running the two services
  separately on port 8000 is simpler.

### Env / config gotchas

- No `.env` file is required for dev: `backend/app/config.py` defaults to `LLM_MODE=mock` and
  `STORAGE_BACKEND=json`, so the app is fully functional offline out of the box.
- Do NOT run tests with `backend/.env` copied from `.env.example`: that template sets
  `REDIS_URL`/`DATABASE_URL`, which flips `redis_ready`/`postgres_ready` to true and breaks
  `tests/test_storage_backend.py::test_default_backend_is_json_and_status` (CI runs with these unset).
  Only create a `.env` when you intentionally want real providers or Postgres/Redis.

### Testing gotchas

- Backend: `cd backend && ./venv/bin/pytest -q` (full suite is ~1440 tests, ~100s).
  Frontend: `cd frontend && npm run test` (Vitest) and `npm run build` (Vite).
- Some tests (e.g. `tests/test_business_intelligence_service.py`) assume a clean/empty JSON
  data directory. Running the app or the suite writes runtime JSON into `backend/app/data/`,
  which can then pollute those tests on the next run. For a pristine test baseline, clear the
  runtime data first with `git clean -fdx backend/app/data/` (this keeps the tracked `.gitkeep`
  and only removes gitignored runtime data). A fresh checkout / fresh VM starts clean, so CI is
  unaffected.
- Never stage `backend/app/data/` runtime JSON; it is gitignored except `.gitkeep`.

### Toolchain

- The VM uses Python 3.12 and Node 22 (CI pins 3.11 / 20, but 3.12 / 22 work). Creating the
  backend venv requires the `python3.12-venv` system package (installed during environment setup);
  it is not part of the per-startup update script.
