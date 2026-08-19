#!/usr/bin/env bash
# Coupe artipascher.fr / www sans arrêter Nord Artisan Pro (PM2 artipascher :3001).
# Usage VPS : sudo bash deploy/disable-artipascher-fr.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/artipascher-fr-shutdown-${STAMP}"
NGINX_SITE="/etc/nginx/sites-available/artipascher"
GONE_SRC="${ROOT}/deploy/artipascher-gone.html"
CONF_SRC="${ROOT}/deploy/nginx-artipascher-offline.conf"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "À lancer en root : sudo bash $0"
  exit 1
fi

if [[ ! -f "$CONF_SRC" || ! -f "$GONE_SRC" ]]; then
  echo "Fichiers manquants : $CONF_SRC ou $GONE_SRC"
  exit 1
fi

echo "==> sauvegarde dans $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -a "$NGINX_SITE" "$BACKUP_DIR/artipascher.nginx.bak"
if [[ -f /var/www/artipascher/data/store.json ]]; then
  cp -a /var/www/artipascher/data/store.json "$BACKUP_DIR/store.json"
fi
if [[ -d /var/www/artipascher/.git ]]; then
  git -C /var/www/artipascher rev-parse --short HEAD > "$BACKUP_DIR/prod-git-head.txt" || true
  git -C /var/www/artipascher log -1 --format='%H %s' > "$BACKUP_DIR/prod-git-log.txt" || true
fi

echo "==> page 410"
cp "$GONE_SRC" /var/www/html/artipascher-gone.html
chmod 644 /var/www/html/artipascher-gone.html

echo "==> vhost hors ligne (artipascher.fr uniquement)"
cp "$CONF_SRC" "$NGINX_SITE"
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/artipascher

echo "==> nginx -t + reload (sites voisins intacts)"
nginx -t
systemctl reload nginx

echo "✅ artipascher.fr coupé — backup $BACKUP_DIR"
echo "   Nord Artisan Pro (PM2 artipascher :3001) n’a pas été arrêté."
