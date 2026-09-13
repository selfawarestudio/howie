#!/usr/bin/env bash
# Per-boot runtime init. Pulls the model + Redis credentials from Vercel so
# `eve dev` can authenticate the Vercel AI Gateway model.
#
# Requires (added as Cloud Agent Secrets):
#   - VERCEL_TOKEN                       Vercel CLI auth
#   - VERCEL_ORG_ID + VERCEL_PROJECT_ID  (or an existing .vercel link) to resolve the project
#
# Writes .env.local (gitignored), which eve loads automatically. Safe no-op when
# the credentials are absent, so the dev server still boots for non-model work.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm use 24 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1

VERCEL="./node_modules/.bin/vercel"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "[start] VERCEL_TOKEN not set; skipping Vercel env pull."
  echo "[start] Set the Vercel secrets (or AI_GATEWAY_API_KEY) to enable model calls."
  exit 0
fi

if [ ! -x "$VERCEL" ]; then
  echo "[start] Vercel CLI not found at $VERCEL (did install run?); skipping."
  exit 0
fi

echo "[start] Linking project and pulling env from Vercel (development)..."
if "$VERCEL" pull --yes --environment=development --token="$VERCEL_TOKEN"; then
  if "$VERCEL" env pull .env.local --yes --environment=development --token="$VERCEL_TOKEN"; then
    echo "[start] Wrote .env.local from Vercel."
  else
    echo "[start] 'vercel env pull' failed; continuing without .env.local."
  fi
else
  echo "[start] 'vercel pull' failed (project not resolvable non-interactively?); continuing."
fi
