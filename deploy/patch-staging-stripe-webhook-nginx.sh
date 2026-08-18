#!/usr/bin/env bash
# Ouvre /api/webhooks/stripe sur le staging IP-locké (webhooks Stripe).
set -euo pipefail

CONF="/etc/nginx/sites-available/artipascher-dev"

if [ "$(id -u)" -ne 0 ]; then
  echo "Relance avec sudo."
  exit 1
fi

if grep -q 'location = /api/webhooks/stripe' "$CONF"; then
  echo "Déjà présent."
else
  python3 - <<'PY'
from pathlib import Path
p = Path("/etc/nginx/sites-available/artipascher-dev")
text = p.read_text()
block = """    location = /api/webhooks/stripe {
        allow all;

        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

"""
marker = "    location / {\n        allow "
if marker not in text:
    raise SystemExit("pattern IP-lock introuvable")
# Inject before each IP-locked location / (HTTP redirect server has no allow)
parts = text.split(marker)
out = [parts[0]]
for part in parts[1:]:
    out.append(block + marker + part)
p.write_text("".join(out))
print("patched")
PY
fi

nginx -t
systemctl reload nginx
echo "OK nginx rechargé"
