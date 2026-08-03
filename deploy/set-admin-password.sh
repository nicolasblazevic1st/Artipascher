#!/usr/bin/env bash
# Met à jour ADMIN_PASSWORD dans .env.local sur le VPS, puis redémarre l'app.
# Usage (sur le VPS) :
#   cd /var/www/artipascher && bash deploy/set-admin-password.sh 'VotreMotDePasse'

set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "Usage: bash deploy/set-admin-password.sh 'mot-de-passe-admin'"
  exit 1
fi

PASSWORD="$1"
ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.local.example "$ENV_FILE"
fi

python3 - <<'PY' "$ENV_FILE" "$PASSWORD"
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
password = sys.argv[2]
text = path.read_text(encoding="utf-8") if path.exists() else ""
line = f'ADMIN_PASSWORD="{password}"'
if re.search(r"^ADMIN_PASSWORD=", text, flags=re.M):
    text = re.sub(r"^ADMIN_PASSWORD=.*$", line, text, flags=re.M)
else:
    text = line + "\n" + text
path.write_text(text, encoding="utf-8")
print("ADMIN_PASSWORD mis à jour dans .env.local")
PY

echo "==> restart PM2"
pm2 restart artipascher || pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Mot de passe admin appliqué — $(date -Iseconds)"
