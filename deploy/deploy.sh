#!/usr/bin/env bash
# Déploiement rapide après un git push
# Usage sur le VPS : cd /var/www/artipascher && bash deploy/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

ENRICHMENT="data/artisans-enrichment.json"
BACKUP=""

if [ -f "$ENRICHMENT" ] && ! git diff --quiet "$ENRICHMENT" 2>/dev/null; then
  BACKUP="$(mktemp /tmp/artisans-enrichment.XXXXXX.json)"
  cp "$ENRICHMENT" "$BACKUP"
  echo "==> sauvegarde $ENRICHMENT (modifs locales: téléphones Places, etc.)"
fi

echo "==> git fetch + reset origin/master"
git fetch origin master
git reset --hard origin/master

if [ -n "$BACKUP" ] && [ -f "$BACKUP" ]; then
  echo "==> fusion enrichissements locaux dans la base Git"
  node scripts/merge-artisans-enrichment.mjs "$BACKUP" "$ENRICHMENT"
  rm -f "$BACKUP"
fi

echo "==> npm ci + build"
npm ci
npm run build

mkdir -p data public/uploads

echo "==> restart PM2"
pm2 restart artipascher || pm2 start ecosystem.config.cjs

echo "✅ Déployé — $(date -Iseconds)"
