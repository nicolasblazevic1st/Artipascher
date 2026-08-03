#!/usr/bin/env bash
# Déploiement rapide après un git push
# Usage sur le VPS : cd /var/www/artipascher && bash deploy/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> git pull"
git pull origin master

echo "==> npm ci + build"
npm ci
npm run build

mkdir -p data public/uploads

echo "==> restart PM2"
pm2 restart artipascher || pm2 start ecosystem.config.cjs

echo "✅ Déployé — $(date -Iseconds)"
