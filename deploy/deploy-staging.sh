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

if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
  echo "==> fusion enrichissements locaux (staging)"
  node scripts/merge-artisans-enrichment.mjs "$BACKUP" "$ENRICHMENT"
  rm -f "$BACKUP"
fi

bash deploy/staging-env.sh .env.local

echo "==> npm ci + build (staging)"
npm ci
npm run build

mkdir -p data public/uploads

echo "==> restart PM2 artipascher-dev"
pm2 restart artipascher-dev || pm2 start ecosystem.staging.config.cjs
pm2 save

echo "==> Nginx dev.artipascher.fr (accès IP uniquement)"
bash deploy/apply-dev-ip-lock.sh

echo "✅ Staging déployé (dev.artipascher.fr:3001) — $(date -Iseconds)"
