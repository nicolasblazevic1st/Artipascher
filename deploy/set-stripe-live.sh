#!/usr/bin/env bash
# Branche Stripe live partiel : PAYMENT_MODE + webhook secret
# STRIPE_SECRET_KEY (sk_live) doit être fourni en arg1
set -euo pipefail
cd /var/www/artipascher

SK="${1:-}"
WHSEC="${2:-}"

if [ -z "$SK" ] || [ -z "$WHSEC" ]; then
  echo "Usage: $0 sk_live_... whsec_..."
  exit 1
fi

python3 - <<PY
from pathlib import Path
p = Path(".env.local")
lines = p.read_text().splitlines()
updates = {
    "PAYMENT_MODE": "stripe",
    "STRIPE_SECRET_KEY": """$SK""",
    "STRIPE_WEBHOOK_SECRET": """$WHSEC""",
}
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else None
    if key in updates:
        if key not in seen:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
        continue
    out.append(line)
for k, v in updates.items():
    if k not in seen:
        out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n")
print("OK: PAYMENT_MODE=stripe + Stripe keys written")
PY

# Vérif sans tout afficher
python3 - <<'PY'
from pathlib import Path
env = {}
for line in Path(".env.local").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k,v = line.split("=",1); env[k]=v
assert env.get("PAYMENT_MODE")=="stripe"
assert env.get("STRIPE_SECRET_KEY","").startswith("sk_")
assert env.get("STRIPE_WEBHOOK_SECRET","").startswith("whsec_")
print("PAYMENT_MODE=", env["PAYMENT_MODE"])
print("STRIPE_SECRET_KEY=", env["STRIPE_SECRET_KEY"][:12]+"…")
print("STRIPE_WEBHOOK_SECRET=", env["STRIPE_WEBHOOK_SECRET"][:10]+"…")
PY

pm2 restart artipascher --update-env
sleep 2
curl -s --max-time 10 --resolve www.nord-artisan-pro.com:443:127.0.0.1 \
  https://www.nord-artisan-pro.com/api/runtime-info | head -c 800
echo
