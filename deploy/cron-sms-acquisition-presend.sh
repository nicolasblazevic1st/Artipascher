#!/usr/bin/env bash
set -euo pipefail
# Juste avant la fenêtre d’envoi : annule les lots du jour si 5/5 déjà atteint.
# Planifier lun–sam ~7h45 Paris : 45 7 * * 1-6
# Puis validation admin manuelle → OVH (ou automatiser plus tard).
BASE_URL="${SITE_URL:-https://dev.nord-artisan-pro.com}"
SECRET="${CRON_SECRET:?CRON_SECRET requis}"
curl -fsS -X POST \
  -H "Authorization: Bearer ${SECRET}" \
  "${BASE_URL}/api/cron/sms-acquisition?mode=presend"
echo
