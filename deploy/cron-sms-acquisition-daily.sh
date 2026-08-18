#!/usr/bin/env bash
set -euo pipefail
# Prépare la veille les lots du lendemain (pending_review, sans OVH si revue activée).
# Planifier lun–sam ~18h Paris : 0 18 * * 1-6
# Exemple crontab UTC+2 été ≈ 16h UTC : 0 16 * * 1-6
BASE_URL="${SITE_URL:-https://dev.nord-artisan-pro.com}"
SECRET="${CRON_SECRET:?CRON_SECRET requis}"
curl -fsS -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  "${BASE_URL}/api/cron/sms-acquisition?mode=prepare"
echo
