#!/usr/bin/env bash
set -euo pipefail
cd /var/www/artipascher
echo "=== VERSION ==="
git describe --tags --always
node -p "require('./package.json').version"
echo "=== BETA / SITE ==="
grep -E '^(NEXT_PUBLIC_SITE_URL|NEXT_PUBLIC_BETA_MODE|BETA_MODE|PAYMENT_MODE)=' .env.local || true
echo "=== KEY STATUS ==="
python3 - <<'PY'
from pathlib import Path
env = {}
for line in Path(".env.local").read_text().splitlines():
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k] = v.strip().strip('"').strip("'")

keys = [
    "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "PAYMENT_MODE",
    "SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM",
    "OVH_SMS_ENABLED", "OVH_APP_KEY", "OVH_APP_SECRET", "OVH_CONSUMER_KEY",
    "OVH_SMS_SERVICE_NAME", "OVH_SMS_SENDER", "ADMIN_SMS_PHONE",
    "GOOGLE_PLACES_ENABLED", "GOOGLE_PLACES_API_KEY", "CRON_SECRET",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID",
]
placeholder = ("", "changeme", "xxx", "your_", "todo", "example", "sk_test_replace")
for k in keys:
    v = env.get(k)
    if v is None:
        print(f"{k}=MISSING")
    elif not v or any(p in v.lower() for p in placeholder if p):
        print(f"{k}=EMPTY/PLACEHOLDER")
    else:
        # mask but show prefix for stripe mode
        if k.startswith("STRIPE") or "KEY" in k or k.endswith("_PASS") or "SECRET" in k:
            pref = v[:7] + "…" if len(v) > 7 else "***"
            print(f"{k}=SET ({pref})")
        else:
            print(f"{k}=SET ({v})")
PY
echo "=== DNS ==="
echo -n "@ -> "; dig +short nord-artisan-pro.com A | tr '\n' ' '; echo
echo -n "www -> "; dig +short www.nord-artisan-pro.com A | tr '\n' ' '; echo
echo -n "dev -> "; dig +short dev.nord-artisan-pro.com A | tr '\n' ' '; echo
echo "=== HTTPS smoke ==="
curl -sI --max-time 8 https://www.nord-artisan-pro.com/ | head -3
curl -sI --max-time 8 https://nord-artisan-pro.com/ 2>&1 | head -3 || true
