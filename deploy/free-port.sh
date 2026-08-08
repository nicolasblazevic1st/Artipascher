#!/usr/bin/env bash
# Libère un port TCP en tuant UNIQUEMENT le PID qui écoute (pas de pkill -f).
# Usage: bash deploy/free-port.sh 3001
set -euo pipefail

PORT="${1:?Usage: free-port.sh <port>}"

echo "==> libération du port $PORT"

pids_listening() {
  local found=""
  if command -v ss >/dev/null 2>&1; then
    found="$(ss -lptn "sport = :${PORT}" 2>/dev/null | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u | tr '\n' ' ')"
  fi
  if [ -z "${found// /}" ] && command -v lsof >/dev/null 2>&1; then
    found="$(lsof -ti ":${PORT}" 2>/dev/null | sort -u | tr '\n' ' ' || true)"
  fi
  if [ -z "${found// /}" ] && command -v fuser >/dev/null 2>&1; then
    found="$(fuser "${PORT}/tcp" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' | sort -u | tr '\n' ' ' || true)"
  fi
  echo "$found"
}

for attempt in 1 2 3 4 5; do
  PIDS="$(pids_listening)"
  PIDS="${PIDS// /}"
  # recompute with spaces for kill
  PIDS="$(pids_listening | xargs echo 2>/dev/null || true)"

  if [ -z "${PIDS// /}" ]; then
    echo "   OK: port $PORT libre"
    exit 0
  fi

  echo "   try $attempt — kill PIDs: $PIDS"
  # shellcheck disable=SC2086
  kill -9 $PIDS 2>/dev/null || true
  # shellcheck disable=SC2086
  sudo kill -9 $PIDS 2>/dev/null || true

  if command -v fuser >/dev/null 2>&1; then
    sudo fuser -k "${PORT}/tcp" 2>/dev/null || fuser -k "${PORT}/tcp" 2>/dev/null || true
  fi

  sleep 1
done

PIDS="$(pids_listening | xargs echo 2>/dev/null || true)"
if [ -n "${PIDS// /}" ]; then
  echo "ERREUR: port $PORT encore occupé par: $PIDS"
  ss -lptn "sport = :${PORT}" 2>/dev/null || true
  ps -fp $PIDS 2>/dev/null || true
  exit 1
fi

echo "   OK: port $PORT libre"
