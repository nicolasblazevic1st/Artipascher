#!/usr/bin/env bash
# Déploiement staging (branche dev) — /var/www/artipascher-dev, port 3001
# Usage sur le VPS : cd /var/www/artipascher-dev && bash deploy/deploy-staging.sh

set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="${ARTIPASCHER_STAGING_BRANCH:-dev}"
ENRICHMENT="data/artisans-enrichment.json"
BACKUP=""

if [ -f "$ENRICHMENT" ] && ! git diff --quiet "$ENRICHMENT" 2>/dev/null; then
  BACKUP="$(mktemp /tmp/artisans-enrichment-staging.XXXXXX.json)"
  cp "$ENRICHMENT" "$BACKUP"
  echo "==> sauvegarde $ENRICHMENT (modifs locales staging)"
fi

echo "==> git fetch + reset origin/$BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

BUILD_ID="$(git rev-parse --short HEAD)"
echo "==> commit déployé : $(git log -1 --oneline)"

# Si le script vient d’être mis à jour par le reset, se relancer une fois
SCRIPT_MARKER="/tmp/artipascher-staging-script-rev"
CURRENT_SCRIPT_REV="$(git rev-parse HEAD:deploy/deploy-staging.sh 2>/dev/null || echo unknown)"
PREV_SCRIPT_REV="$(cat "$SCRIPT_MARKER" 2>/dev/null || true)"
if [ "$CURRENT_SCRIPT_REV" != "$PREV_SCRIPT_REV" ]; then
  echo "$CURRENT_SCRIPT_REV" > "$SCRIPT_MARKER"
  if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
    export ARTIPASCHER_STAGING_ENRICHMENT_BACKUP="$BACKUP"
  fi
  export ARTIPASCHER_BUILD_ID="$BUILD_ID"
  echo "==> script deploy mis à jour — relance"
  exec bash deploy/deploy-staging.sh
fi

if [ -n "${ARTIPASCHER_STAGING_ENRICHMENT_BACKUP:-}" ] && [ -f "$ARTIPASCHER_STAGING_ENRICHMENT_BACKUP" ]; then
  echo "==> fusion enrichissements locaux (staging)"
  node scripts/merge-artisans-enrichment.mjs "$ARTIPASCHER_STAGING_ENRICHMENT_BACKUP" "$ENRICHMENT"
  rm -f "$ARTIPASCHER_STAGING_ENRICHMENT_BACKUP"
elif [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
  echo "==> fusion enrichissements locaux (staging)"
  node scripts/merge-artisans-enrichment.mjs "$BACKUP" "$ENRICHMENT"
  rm -f "$BACKUP"
fi

bash deploy/staging-env.sh .env.local

# Identifiant de build lisible par /api/runtime-info
set_env_build() {
  local key="ARTIPASCHER_BUILD_ID"
  local value="${ARTIPASCHER_BUILD_ID:-$BUILD_ID}"
  local tmp=".env.local.tmp.$$"
  if [ -f .env.local ]; then
    grep -v "^${key}=" .env.local > "$tmp" || true
  else
    : > "$tmp"
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" .env.local
}
set_env_build

echo "==> npm ci + build (staging) — buildId=${ARTIPASCHER_BUILD_ID:-$BUILD_ID}"
npm ci
ARTIPASCHER_BUILD_ID="${ARTIPASCHER_BUILD_ID:-$BUILD_ID}" npm run build

mkdir -p data public/uploads
printf '%s\n' "${ARTIPASCHER_BUILD_ID:-$BUILD_ID}" > public/build-id.txt

echo "==> restart PM2 artipascher-dev (env staging)"
pm2 delete artipascher-dev 2>/dev/null || true
ARTIPASCHER_BUILD_ID="${ARTIPASCHER_BUILD_ID:-$BUILD_ID}" pm2 start ecosystem.staging.config.cjs
pm2 save

echo "==> Nginx dev.artipascher.fr (accès IP uniquement)"
bash deploy/apply-dev-ip-lock.sh

echo "==> vérif proxy local"
echo -n "   :3001 title: "
curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/" | grep -o '<title>[^<]*</title>' | head -1 || echo "(échec)"
echo -n "   :3000 title: "
curl -s -H "Host: artipascher.fr" "http://127.0.0.1:3000/" | grep -o '<title>[^<]*</title>' | head -1 || echo "(échec)"
echo -n "   runtime-info: "
curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/api/runtime-info" || echo "(échec)"
echo

echo "✅ Staging déployé (dev.artipascher.fr:3001) — commit ${ARTIPASCHER_BUILD_ID:-$BUILD_ID} — $(date -Iseconds)"
