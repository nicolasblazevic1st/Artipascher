#!/usr/bin/env bash
# Installation initiale sur VPS Debian/Ubuntu (OVH)
# Usage : sudo bash deploy/setup-vps.sh

set -euo pipefail

APP_DIR="/var/www/artipascher"
REPO="${ARTIPASCHER_REPO:-https://github.com/nicolasblazevic1st/Artipascher.git}"

echo "==> Mise à jour système"
apt-get update -qq
apt-get install -y curl git nginx

echo "==> Node.js 20"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> PM2"
npm install -g pm2

echo "==> Clone ou pull"
mkdir -p /var/www
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull origin master
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "==> Dépendances et build"
npm ci
npm run build

mkdir -p data public/uploads
chmod -R 775 data public/uploads

if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo ""
  echo "⚠️  Éditez $APP_DIR/.env.local (ADMIN_PASSWORD, NEXT_PUBLIC_SITE_URL, PAYMENT_MODE…)"
fi

echo "==> PM2"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u "${SUDO_USER:-root}" --hp "/root" || true

echo ""
echo "✅ App sur http://127.0.0.1:3000"
echo "   Configurez Nginx (deploy/nginx.conf.example) puis : certbot --nginx -d votre-domaine.fr"
