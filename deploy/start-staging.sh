#!/usr/bin/env bash
# Démarre Next staging (port 3002 par défaut).
# Utilisé par PM2 (chaque restart nettoie les zombies).
set -euo pipefail

STAGING_DIR="/var/www/artipascher-dev"
PORT="${PORT:-3002}"
cd "$STAGING_DIR"

export NODE_ENV=production
export PORT
export ARTIPASCHER_STAGING="${ARTIPASCHER_STAGING:-1}"
export BETA_MODE="${BETA_MODE:-false}"
export NEXT_PUBLIC_BETA_MODE="${NEXT_PUBLIC_BETA_MODE:-false}"
export NEXT_PUBLIC_ARTIPASCHER_STAGING="${NEXT_PUBLIC_ARTIPASCHER_STAGING:-1}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://dev.nord-artisan-pro.com}"

# Libérer CE port uniquement (PIDs listeners), sans pkill -f
bash "$STAGING_DIR/deploy/free-port.sh" "$PORT" || true

exec "$STAGING_DIR/node_modules/next/dist/bin/next" start -p "$PORT" -H 0.0.0.0
