#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:5173}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-5}"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red() { printf '\033[31m%s\033[0m\n' "$*"; }
blue() { printf '\033[36m%s\033[0m\n' "$*"; }

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  green "PASS  $*"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  yellow "WARN  $*"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  red "FAIL  $*"
}

http_get() {
  local url="$1"
  curl --silent --show-error --max-time "$TIMEOUT_SECONDS" "$url"
}

check_frontend() {
  local body
  if body="$(http_get "$FRONTEND_URL")"; then
    if printf '%s' "$body" | grep -Eqi '<!doctype html|<html'; then
      pass "Frontend reachable at $FRONTEND_URL"
    else
      warn "Frontend responded, but it did not look like the Vite app HTML"
    fi
  else
    fail "Frontend not reachable at $FRONTEND_URL"
    printf '      Start it with: cd %s/frontend && npm run dev -- --host 127.0.0.1 --port 5173\n' "$ROOT_DIR"
  fi
}

check_endpoint() {
  local label="$1"
  local path="$2"
  local required="${3:-optional}"
  local url="$BACKEND_URL$path"
  local body

  if body="$(http_get "$url" 2>/tmp/evolveagent_manual_ui_check.err)"; then
    if python3 -m json.tool >/dev/null 2>&1 <<<"$body"; then
      pass "$label: $path"
      printf '      %s\n' "$(python3 - <<'PY' "$body"
import json
import sys

data = json.loads(sys.argv[1])
if isinstance(data, dict):
    keys = list(data.keys())[:8]
    print("keys: " + ", ".join(keys))
elif isinstance(data, list):
    print(f"items: {len(data)}")
else:
    print(type(data).__name__)
PY
)"
    else
      warn "$label returned non-JSON response from $path"
    fi
  else
    if [ "$required" = "required" ]; then
      fail "$label unreachable: $path"
    else
      warn "$label unavailable: $path"
    fi
    if [ -s /tmp/evolveagent_manual_ui_check.err ]; then
      printf '      %s\n' "$(tr '\n' ' ' </tmp/evolveagent_manual_ui_check.err | sed 's/[[:space:]]\+/ /g')"
    fi
  fi
}

print_manual_checklist() {
  cat <<EOF

Manual UI checklist
-------------------
Open: $FRONTEND_URL

1. Home Dashboard
   - Page loads without blank panels.
   - Live/local status badges match backend readiness.

2. Chat
   - Send: "Explain EvolveAgent in simple words."
   - Confirm response appears and Developer details do not crash.

3. Project Brain / Memory
   - Use "Add Memory Fast" or Add Memory.
   - Add: "I prefer concise answers with clear next steps."
   - Search: "concise answers".
   - Confirm the memory result appears with source/mode details.

4. Developer Console
   - Confirm system status, storage, providers, integrations, and governance cards load from live data.
   - No hardcoded "mock only" or stale provider status should appear when real config is enabled.

5. Mission Control
   - Create or open a goal.
   - Confirm task cards render and status updates do not fail.

6. Agents
   - Confirm agent cards describe role, tools, permission level, memory scope, and active state.
   - Empty states should be helpful if no live data exists.

7. Tools / MCP Hub
   - Open tool details.
   - Dry-run or preview actions only unless approval is explicitly requested.

8. Approvals
   - Confirm pending/empty state is clear.
   - Approve/reject buttons should only show when an approval exists.

9. Governance
   - Confirm counts and recent events load.
   - Trigger a safe action, then refresh and confirm a new event appears.

10. Settings
    - Confirm backend/storage/provider/integration readiness uses booleans/status, not secret values.

11. Responsive check
    - Browser devtools around 390px width.
    - Sidebar/navigation remains usable and text does not overlap.

EOF
}

main() {
  blue "EvolveAgent manual UI check"
  printf 'Repo: %s\nBackend: %s\nFrontend: %s\n\n' "$ROOT_DIR" "$BACKEND_URL" "$FRONTEND_URL"

  check_frontend
  check_endpoint "Backend health" "/health" "required"
  check_endpoint "Storage status" "/api/system/storage-status" "optional"
  check_endpoint "Memory v2 status" "/api/memory-v2/status" "optional"
  check_endpoint "Provider summary" "/api/provider-control/summary" "optional"
  check_endpoint "Governance log" "/api/governance" "optional"
  check_endpoint "Goals" "/api/goals" "optional"
  check_endpoint "MCP connectors" "/api/mcp/connectors" "optional"
  check_endpoint "Approvals" "/api/approvals" "optional"
  check_endpoint "Slack status" "/api/integrations/slack/status" "optional"
  check_endpoint "Notion status" "/api/integrations/notion/status" "optional"

  print_manual_checklist

  printf 'Summary: %s pass, %s warn, %s fail\n' "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"
  if [ "$FAIL_COUNT" -gt 0 ]; then
    printf '\nStart servers if needed:\n'
    printf '  cd %s/backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000\n' "$ROOT_DIR"
    printf '  cd %s/frontend && npm run dev -- --host 127.0.0.1 --port 5173\n' "$ROOT_DIR"
    exit 1
  fi
}

main "$@"
