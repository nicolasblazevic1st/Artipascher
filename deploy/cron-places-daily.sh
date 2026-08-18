#!/usr/bin/env bash
set -euo pipefail
# Enrichissement Places quotidien — à planifier: 15 2 * * *
BASE_URL="${SITE_URL:-https://nord-artisan-pro.com}"
SECRET="${CRON_SECRET:?CRON_SECRET requis}"
curl -fsS -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  "${BASE_URL}/api/cron/places-enrich"
echo
