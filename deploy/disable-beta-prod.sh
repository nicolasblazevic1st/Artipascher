#!/usr/bin/env bash
# Désactive le mode bêta en prod et rebuild
set -euo pipefail
cd /var/www/artipascher

python3 - <<'PY'
from pathlib import Path
p = Path(".env.local")
lines = p.read_text().splitlines()
keys = {
    "NEXT_PUBLIC_BETA_MODE": "false",
    "BETA_MODE": "false",
}
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else None
    if key in keys:
        if key not in seen:
            out.append(f"{key}={keys[key]}")
            seen.add(key)
        continue
    out.append(line)
for k, v in keys.items():
    if k not in seen:
        out.append(f"{k}={v}")
p.write_text("\n".join(out) + "\n")
print("updated:", {k: keys[k] for k in keys})
PY

grep -E '^(NEXT_PUBLIC_)?BETA_MODE=' .env.local

BUILD_ID="$(git rev-parse --short HEAD)"
rm -rf .next
ARTIPASCHER_BUILD_ID="$BUILD_ID" npm run build
printf '%s\n' "$BUILD_ID" > public/build-id.txt
pm2 restart artipascher --update-env
sleep 2

echo "==> smoke"
curl -s --max-time 15 --resolve www.nord-artisan-pro.com:443:127.0.0.1 https://www.nord-artisan-pro.com/ \
  | tr '\n' ' ' | sed 's/<[^>]*>/ /g' | tr -s ' ' | cut -c1-500
echo
if curl -s --max-time 15 --resolve www.nord-artisan-pro.com:443:127.0.0.1 https://www.nord-artisan-pro.com/ | grep -q 'Version bêta'; then
  echo "ERREUR: bandeau bêta encore présent"
  exit 1
fi
echo "OK: bandeau bêta retiré"
