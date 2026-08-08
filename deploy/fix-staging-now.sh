#!/usr/bin/env bash
# Remise en route rapide du staging SANS rebuild.
# Usage sur le VPS :
#   cd /var/www/artipascher-dev && bash deploy/fix-staging-now.sh
set -euo pipefail

STAGING_DIR="/var/www/artipascher-dev"
cd "$STAGING_DIR"

if [ ! -d .next ]; then
  echo "ERREUR: pas de .next — lance d'abord deploy/deploy-staging.sh"
  exit 1
fi

BUILD_ID="$(cat public/build-id.txt 2>/dev/null || git rev-parse --short HEAD)"

echo "==> stop PM2 artipascher-dev"
pm2 delete artipascher-dev 2>/dev/null || true

bash "$STAGING_DIR/deploy/free-port.sh" 3001

echo "==> start PM2 (build $BUILD_ID)"
ARTIPASCHER_BUILD_ID="$BUILD_ID" pm2 start "$STAGING_DIR/ecosystem.staging.config.cjs"
pm2 save

echo "==> attente 5s…"
sleep 5

echo "==> vérifs"
pm2 show artipascher-dev | grep -iE 'status|restarts|uptime|script path|cwd' || true
echo -n "title: "
curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/" | grep -o '<title>[^<]*</title>' | head -1 || echo "(échec)"
echo -n "runtime-info: "
curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/api/runtime-info" || echo "(échec)"
echo
echo -n "build-id: "
curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/build-id.txt" || echo "(échec)"
echo

TITLE="$(curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/" | grep -o '<title>[^<]*</title>' | head -1 || true)"
if echo "$TITLE" | grep -q "Bêta ·"; then
  echo "ERREUR: titre encore en bêta — logs :"
  pm2 logs artipascher-dev --err --lines 40 --nostream || true
  exit 1
fi

if ! curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/api/runtime-info" | grep -q '"beta":false'; then
  echo "ERREUR: runtime-info sans beta:false"
  exit 1
fi

echo "✅ Staging OK — https://dev.artipascher.fr"
