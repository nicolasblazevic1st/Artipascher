#!/usr/bin/env bash
set -euo pipefail
# Sync RGE ADEME — à planifier: 30 4 * * *
BASE_URL="${SITE_URL:-https://nord-artisan-pro.com}"
SECRET="${CRON_SECRET:?CRON_SECRET requis}"
curl -fsS -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/api/cron/rge-sync"
echo
