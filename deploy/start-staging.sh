#!/usr/bin/env bash
# Démarre Next staging après avoir libéré le port 3001.
# Utilisé par PM2 (chaque restart nettoie les zombies).
set -euo pipefail

STAGING_DIR="/var/www/artipascher-dev"
PORT="${PORT:-3001}"
cd "$STAGING_DIR"

bash "$STAGING_DIR/deploy/free-port.sh" "$PORT"

export NODE_ENV=production
export PORT
export ARTIPASCHER_STAGING="${ARTIPASCHER_STAGING:-1}"
export BETA_MODE="${BETA_MODE:-false}"
export NEXT_PUBLIC_BETA_MODE="${NEXT_PUBLIC_BETA_MODE:-false}"
export NEXT_PUBLIC_ARTIPASCHER_STAGING="${NEXT_PUBLIC_ARTIPASCHER_STAGING:-1}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://dev.artipascher.fr}"

exec "$STAGING_DIR/node_modules/next/dist/bin/next" start -p "$PORT" -H 0.0.0.0
