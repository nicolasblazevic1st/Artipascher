#!/usr/bin/env bash
set -euo pipefail
cd /var/www/artipascher

SMTP_PASS_VALUE="$1"

python3 - <<PY
from pathlib import Path
p = Path(".env.local")
lines = p.read_text().splitlines()
updates = {
    "SMTP_HOST": "ssl0.ovh.net",
    "SMTP_PORT": "587",
    "SMTP_USER": "contact@nord-artisan-pro.com",
    "SMTP_PASS": """$SMTP_PASS_VALUE""",
    "EMAIL_FROM": "Nord Artisan Pro <contact@nord-artisan-pro.com>",
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
print("SMTP env written")
PY

python3 - <<'PY'
from pathlib import Path
env = {}
for line in Path(".env.local").read_text().splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k] = v
assert env.get("SMTP_HOST") == "ssl0.ovh.net"
assert env.get("SMTP_USER") == "contact@nord-artisan-pro.com"
assert env.get("SMTP_PASS")
print("SMTP_HOST=", env["SMTP_HOST"])
print("SMTP_PORT=", env.get("SMTP_PORT"))
print("SMTP_USER=", env["SMTP_USER"])
print("SMTP_PASS=", "***set***")
print("EMAIL_FROM=", env.get("EMAIL_FROM"))
PY

pm2 restart artipascher --update-env
sleep 2
pm2 show artipascher | head -20
