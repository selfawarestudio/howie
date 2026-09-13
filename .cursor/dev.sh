#!/usr/bin/env bash
# Long-running eve dev server (HTTP, no TUI) on port 3000.
# eve auto-loads .env.local written by start.sh.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 24 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1

export PORT="${PORT:-3000}"
exec npm run dev -- --no-ui
