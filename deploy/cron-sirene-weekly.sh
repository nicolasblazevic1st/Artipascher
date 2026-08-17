#!/usr/bin/env bash
set -euo pipefail
# Sync SIRENE hebdomadaire — à planifier: 0 3 * * 1
BASE_URL="${SITE_URL:-https://nord-artisan-pro.com}"
SECRET="${CRON_SECRET:?CRON_SECRET requis}"
curl -fsS -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"maxPagesPerNaf":4,"markMissingClosed":false}' \
  "${BASE_URL}/api/cron/sirene-sync"
echo
