#!/usr/bin/env bash
# Remise en route rapide du staging SANS rebuild (port 3002).
# Usage: cd /var/www/artipascher-dev && bash deploy/fix-staging-now.sh
set -euo pipefail

STAGING_DIR="/var/www/artipascher-dev"
PORT=3002
cd "$STAGING_DIR"

if [ ! -d .next ]; then
  echo "ERREUR: pas de .next — lance d'abord deploy/deploy-staging.sh"
  exit 1
fi

BUILD_ID="$(cat public/build-id.txt 2>/dev/null || git rev-parse --short HEAD)"

echo "==> stop PM2 artipascher-dev"
pm2 stop artipascher-dev 2>/dev/null || true
pm2 delete artipascher-dev 2>/dev/null || true
sleep 1

chmod +x deploy/free-port.sh deploy/start-staging.sh
bash deploy/free-port.sh "$PORT"

echo "==> start PM2 sur port $PORT (build $BUILD_ID)"
ARTIPASCHER_BUILD_ID="$BUILD_ID" PORT="$PORT" pm2 start "$STAGING_DIR/ecosystem.staging.config.cjs"
pm2 save

echo "==> Nginx → 127.0.0.1:$PORT (Basic Auth)"
bash deploy/apply-dev-basic-auth.sh

echo "==> attente démarrage…"
STABLE=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  sleep 2
  STATUS="$(pm2 jlist | node -e "
    const apps=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const a=apps.find(x=>x.name==='artipascher-dev');
    if(!a){console.log('missing 0 0'); process.exit(0)}
    const secs=Math.floor((Date.now()-(a.pm2_env.pm_uptime||Date.now()))/1000);
    console.log([a.pm2_env.status, a.pm2_env.unstable_restarts||0, secs].join(' '));
  " 2>/dev/null || echo 'missing 0 0')"
  echo "   try $i: $STATUS"
  ST="$(echo "$STATUS" | awk '{print $1}')"
  UN="$(echo "$STATUS" | awk '{print $2}')"
  SE="$(echo "$STATUS" | awk '{print $3}')"
  if [ "$ST" = "online" ] && [ "${UN:-9}" -lt 3 ] && [ "${SE:-0}" -ge 4 ]; then
    STABLE=1
    break
  fi
done

if [ "$STABLE" != "1" ]; then
  echo "ERREUR: process instable"
  pm2 logs artipascher-dev --err --lines 40 --nostream || true
  ss -lptn "sport = :${PORT}" || true
  exit 1
fi

echo "==> vérifs (port $PORT)"
TITLE="$(curl -s -H "Host: dev.nord-artisan-pro.com" "http://127.0.0.1:${PORT}/" | grep -o '<title>[^<]*</title>' | head -1 || true)"
RUNTIME="$(curl -s -H "Host: dev.nord-artisan-pro.com" "http://127.0.0.1:${PORT}/api/runtime-info" || true)"
BUILD_TXT="$(curl -s -H "Host: dev.nord-artisan-pro.com" "http://127.0.0.1:${PORT}/build-id.txt" || true)"
echo "   title: ${TITLE:-'(vide)'}"
echo "   runtime-info: $RUNTIME"
echo "   build-id: ${BUILD_TXT:-'(vide)'}"
echo "   note: un zombie peut encore occuper :3001 — Nginx pointe maintenant sur :$PORT"

if echo "$TITLE" | grep -q "Bêta ·"; then
  echo "ERREUR: titre encore en bêta"
  exit 1
fi
if ! echo "$RUNTIME" | grep -q '"beta":false'; then
  echo "ERREUR: runtime-info sans beta:false"
  exit 1
fi

echo "✅ Staging OK — https://dev.nord-artisan-pro.com (backend :$PORT)"
