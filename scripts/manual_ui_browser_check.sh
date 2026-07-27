#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find_playwright_module() {
  if [ -f "$ROOT_DIR/frontend/node_modules/playwright/index.mjs" ]; then
    printf '%s\n' "$ROOT_DIR/frontend/node_modules/playwright/index.mjs"
    return 0
  fi
  if [ -f "$ROOT_DIR/node_modules/playwright/index.mjs" ]; then
    printf '%s\n' "$ROOT_DIR/node_modules/playwright/index.mjs"
    return 0
  fi
  find "$HOME/.npm/_npx" -path '*/node_modules/playwright/package.json' -print 2>/dev/null \
    | while read -r package_json; do
        node -e "const p='$package_json'; const pkg=require(p); console.log(pkg.version + ' ' + p.replace(/package\\.json$/, 'index.mjs'))"
      done \
    | sort -V \
    | tail -1 \
    | awk '{print $2}'
}

PLAYWRIGHT_MODULE="${PLAYWRIGHT_MODULE:-$(find_playwright_module)}"

if [ -z "$PLAYWRIGHT_MODULE" ] || [ ! -f "$PLAYWRIGHT_MODULE" ]; then
  echo "Playwright was not found. Installing temporary Playwright browser runner with npx..."
  npx -y playwright@latest install chromium
  PLAYWRIGHT_MODULE="$(find_playwright_module)"
fi

if [ -z "$PLAYWRIGHT_MODULE" ] || [ ! -f "$PLAYWRIGHT_MODULE" ]; then
  echo "Could not find Playwright after install. Try: npx -y playwright@latest install chromium"
  exit 1
fi

PLAYWRIGHT_MODULE="$PLAYWRIGHT_MODULE" node "$ROOT_DIR/scripts/manual_ui_browser_check.mjs"
