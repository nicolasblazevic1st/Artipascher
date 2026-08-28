#!/usr/bin/env bash
# Déploiement prod Artipascher uniquement (PM2: artipascher, port 3001).
# Ne pas toucher aux autres apps / ports (3000, 3002, …).
# Usage sur le VPS : cd /var/www/artipascher && bash deploy/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

APP_NAME="artipascher"
APP_PORT="3001"
BUILD_DIR=".next-build"
OLD_DIR=".next-old"
SCRIPT_MARKER="/tmp/artipascher-prod-script-rev"

wait_for_local() {
  local i
  echo "==> attente Next sur 127.0.0.1:${APP_PORT}"
  for i in $(seq 1 45); do
    if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${APP_PORT}/"; then
      echo "==> app prête (${i}s)"
      return 0
    fi
    sleep 1
  done
  echo "⚠ l'app n'a pas répondu sur :${APP_PORT} après 45s" >&2
  return 1
}

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

# Relance une fois si ce script a changé (le bash en cours a encore l'ancienne version).
CURRENT_SCRIPT_REV="$(git rev-parse HEAD:deploy/deploy.sh 2>/dev/null || echo unknown)"
PREV_SCRIPT_REV="$(cat "$SCRIPT_MARKER" 2>/dev/null || true)"
if [ "$CURRENT_SCRIPT_REV" != "$PREV_SCRIPT_REV" ]; then
  echo "$CURRENT_SCRIPT_REV" > "$SCRIPT_MARKER"
  echo "==> script deploy mis à jour — relance"
  exec bash deploy/deploy.sh
fi

echo "==> npm ci + build dans ${BUILD_DIR} (.next live inchangé)"
npm ci
rm -rf "$BUILD_DIR"
NEXT_DIST_DIR="$BUILD_DIR" npm run build

if [ ! -f "${BUILD_DIR}/BUILD_ID" ]; then
  echo "ERREUR: build incomplet (${BUILD_DIR}/BUILD_ID manquant)" >&2
  exit 1
fi

mkdir -p data public/uploads

echo "==> bascule ${BUILD_DIR} → .next + restart ${APP_NAME} uniquement"
rm -rf "$OLD_DIR"
if [ -d .next ]; then
  mv .next "$OLD_DIR"
fi
mv "$BUILD_DIR" .next

pm2 restart "$APP_NAME"

if wait_for_local; then
  rm -rf "$OLD_DIR"
else
  if [ -d "$OLD_DIR" ]; then
    echo "==> rollback vers ${OLD_DIR}"
    rm -rf .next
    mv "$OLD_DIR" .next
    pm2 restart "$APP_NAME"
    wait_for_local || true
  fi
  echo "ERREUR: déploiement ${APP_NAME} — healthcheck :${APP_PORT} échoué" >&2
  pm2 logs "$APP_NAME" --err --lines 40 --nostream || true
  exit 1
fi

echo "✅ Déployé — $(date -Iseconds)"
