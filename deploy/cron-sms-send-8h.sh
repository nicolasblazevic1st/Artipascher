#!/usr/bin/env bash
set -euo pipefail
# Seule tâche cron SMS : envoie les lots cochés « prêt à partir ».
# Planifier lun–sam 8h Paris :
#   CRON_TZ=Europe/Paris
#   0 8 * * 1-6  SITE_URL=https://nord-artisan-pro.com CRON_SECRET=… bash /var/www/artipascher/deploy/cron-sms-send-8h.sh
BASE_URL="${SITE_URL:-https://nord-artisan-pro.com}"
SECRET="${CRON_SECRET:?CRON_SECRET requis}"
curl -fsS -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  "${BASE_URL}/api/cron/sms-acquisition?mode=send"
echo
