#!/usr/bin/env bash
# Libère un port TCP (tue le process qui écoute).
# Usage: bash deploy/free-port.sh 3001
set -euo pipefail

PORT="${1:?Usage: free-port.sh <port>}"

echo "==> libération du port $PORT"

kill_pids() {
  local pids="$1"
  if [ -z "$pids" ]; then
    return 0
  fi
  echo "   kill -9: $pids"
  # shellcheck disable=SC2086
  kill -9 $pids 2>/dev/null || true
  # shellcheck disable=SC2086
  sudo kill -9 $pids 2>/dev/null || true
}

# 1) fuser
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sudo fuser -k "${PORT}/tcp" 2>/dev/null || true
fi

# 2) lsof
if command -v lsof >/dev/null 2>&1; then
  kill_pids "$(lsof -ti ":$PORT" 2>/dev/null || true)"
fi

# 3) ss → pid=
PIDS_SS="$(ss -lptn "sport = :${PORT}" 2>/dev/null | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u | tr '\n' ' ')"
kill_pids "$PIDS_SS"

# 4) next-server / next start liés au staging
pkill -9 -f "/var/www/artipascher-dev/node_modules/next" 2>/dev/null || true
sudo pkill -9 -f "/var/www/artipascher-dev/node_modules/next" 2>/dev/null || true
pkill -9 -f "next start -p ${PORT}" 2>/dev/null || true
sudo pkill -9 -f "next start -p ${PORT}" 2>/dev/null || true

sleep 2

if ss -lptn "sport = :${PORT}" 2>/dev/null | grep -q ":${PORT}"; then
  echo "ERREUR: port $PORT encore occupé :"
  ss -lptn "sport = :${PORT}" || true
  exit 1
fi

echo "   OK: port $PORT libre"
