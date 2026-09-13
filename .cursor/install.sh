#!/usr/bin/env bash
# Idempotent dependency setup for the Howie eve agent.
# Runs after checkout. Ensures Node 24 (repo requires 24.x) and installs deps.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install 24 >/dev/null
nvm alias default 24 >/dev/null
nvm use 24 >/dev/null

echo "[install] node $(node -v), npm $(npm -v)"
npm ci
echo "[install] done"
