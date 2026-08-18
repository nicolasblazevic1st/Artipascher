#!/usr/bin/env bash
# Libère un port TCP : tue le process qui écoute + son parent (process group).
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
  echo "$found" | xargs echo 2>/dev/null || true
}

kill_tree() {
  local pid="$1"
  [ -n "$pid" ] || return 0
  local ppid
  ppid="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
  # Tuer le parent d'abord s'il ressemble à next / bash start-staging / node
  if [ -n "$ppid" ] && [ "$ppid" != "1" ]; then
    local pcmd
    pcmd="$(ps -o cmd= -p "$ppid" 2>/dev/null || true)"
    if echo "$pcmd" | grep -Eqi 'next|start-staging|node|npm'; then
      echo "   kill parent $ppid ($pcmd)"
      kill -9 "$ppid" 2>/dev/null || sudo kill -9 "$ppid" 2>/dev/null || true
    fi
  fi
  echo "   kill $pid"
  kill -9 "$pid" 2>/dev/null || sudo kill -9 "$pid" 2>/dev/null || true
}

for attempt in 1 2 3 4 5 6 7 8; do
  PIDS="$(pids_listening)"
  if [ -z "${PIDS// /}" ]; then
    echo "   OK: port $PORT libre"
    exit 0
  fi

  echo "   try $attempt — PIDs: $PIDS"
  for pid in $PIDS; do
    ps -fp "$pid" 2>/dev/null || true
    kill_tree "$pid"
  done

  if command -v fuser >/dev/null 2>&1; then
    sudo fuser -k "${PORT}/tcp" 2>/dev/null || fuser -k "${PORT}/tcp" 2>/dev/null || true
  fi
  sleep 1
done

PIDS="$(pids_listening)"
if [ -n "${PIDS// /}" ]; then
  echo "ERREUR: port $PORT encore occupé par: $PIDS"
  ss -lptn "sport = :${PORT}" 2>/dev/null || true
  for pid in $PIDS; do
    ps -fp "$pid" 2>/dev/null || true
    pstree -ap "$pid" 2>/dev/null || true
  done
  echo "==> pm2 list :"
  pm2 list 2>/dev/null || true
  exit 1
fi

echo "   OK: port $PORT libre"
