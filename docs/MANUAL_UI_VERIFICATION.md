# EvolveAgent AI Manual UI Verification

Use this after pulling latest `main` to confirm the app works with live backend data.

## Start The App

Terminal 1:

```bash
cd /Users/manitdankhara/evolveagent-ai/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2:

```bash
cd /Users/manitdankhara/evolveagent-ai/frontend
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Core Smoke Test

1. Open the app and confirm the top bar shows the backend as connected.
2. Open **Chat**.
3. Select a workspace in the project context card.
4. Send: `Explain what EvolveAgent AI is doing in this workspace.`
5. Confirm the response appears and does not say the backend is unavailable.

## Memory

1. Open **Project Brain**.
2. In **Quick Add Memory**, add:
   - Title: `Resume bullet style`
   - Content: `Resume bullets should start with strong action verbs and include measurable impact when true.`
   - Importance: `High`
   - Tags: `resume, ats, preference`
3. Click **Save Memory**.
4. Confirm the memory count updates after refresh.
5. Search `resume bullets` and confirm a relevant memory appears.

## Custom Agent Builder

1. Open **Agents**.
2. In **Custom Agent Builder**, choose `Resume Agent`.
3. Confirm the form fills name, role, prompt, tools, and permission level.
4. Click **Create Agent**.
5. Confirm a success toast appears.
6. Confirm the active project context can select or reflect the new agent after refresh.

## Mission Control

1. Open **Mission Control**.
2. In **Goal Planner Agent**, enter:
   `Build an AI resume analyzer app with upload, scoring, ATS feedback, and a clean demo.`
3. Click **Create Goal**.
4. Confirm a success toast shows planned task count.
5. Confirm phases and task cards appear.
6. Click **Start Task** on one planned task.
7. If it requires approval, open **Approvals** and confirm the pending action appears.
8. If it completes or runs, confirm Mission Control refreshes without errors.

## Governance And Approvals

1. Open **Approvals**.
2. Confirm pending approvals show action name, risk, and source agent when available.
3. Approve or reject one safe test approval only.
4. Open **Governance**.
5. Confirm a governance event was logged for the decision.

## Tools And Connectors

1. Open **Tools / MCP Hub**.
2. Confirm connector cards load with status and risk badges.
3. Run a dry-run or preview action only.
4. Confirm no secret values are displayed.

## Developer Console

1. Open **Developer Mode**.
2. Confirm Storage, providers, governance, code-change, and workflow panels load live status.
3. Confirm failures show clear messages, not blank cards.

## Expected Safe Behavior

- Real destructive actions should not run without approval.
- External sends, paid jobs, and file writes should be gated or preview-only.
- Secrets should never appear in UI cards, logs, toasts, or API output.
- If the backend is stopped, the UI may show fallback data, but it should clearly say live backend is unavailable.

## Verification Commands

```bash
cd /Users/manitdankhara/evolveagent-ai/backend
./venv/bin/pytest -q

cd /Users/manitdankhara/evolveagent-ai/frontend
npm run test
npm run build
```
