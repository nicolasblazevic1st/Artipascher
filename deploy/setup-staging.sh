#!/usr/bin/env bash
# Installation initiale environnement DEV sur le VPS (à côté de la prod).
# Usage : bash deploy/setup-staging.sh
# (depuis /var/www/artipascher après git pull, ou après clone manuel)

set -euo pipefail

STAGING_DIR="/var/www/artipascher-dev"
PROD_DIR="/var/www/artipascher"
REPO="${ARTIPASCHER_REPO:-https://github.com/nicolasblazevic1st/Artipascher.git}"
BRANCH="${ARTIPASCHER_STAGING_BRANCH:-dev}"
NGINX_SITE="/etc/nginx/sites-available/artipascher-dev"

echo "==> Environnement staging Artipascher"
echo "    Dossier : $STAGING_DIR"
echo "    Branche : $BRANCH"
echo "    Port    : 3002"

sudo mkdir -p /var/www

if [ -d "$STAGING_DIR/.git" ]; then
  echo "==> Dépôt staging existant — mise à jour"
  cd "$STAGING_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  echo "==> Clone staging"
  sudo git clone -b "$BRANCH" "$REPO" "$STAGING_DIR" 2>/dev/null || {
    sudo git clone "$REPO" "$STAGING_DIR"
    cd "$STAGING_DIR"
    sudo git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || sudo git checkout -b "$BRANCH"
  }
  cd "$STAGING_DIR"
  sudo chown -R "$USER:$USER" "$STAGING_DIR"
fi

cd "$STAGING_DIR"

if [ ! -f .env.local ]; then
  echo "==> .env.local staging"
  cp deploy/env.staging.example .env.local
  if [ -f "$PROD_DIR/.env.local" ]; then
    PROD_ADMIN=$(grep -E '^ADMIN_PASSWORD=' "$PROD_DIR/.env.local" | cut -d= -f2- || true)
    if [ -n "$PROD_ADMIN" ]; then
      grep -v '^ADMIN_PASSWORD=' .env.local > .env.local.tmp
      printf 'ADMIN_PASSWORD=%s@\n' "$PROD_ADMIN" >> .env.local.tmp
      mv .env.local.tmp .env.local
    fi
  fi
  echo "    Mot de passe admin staging = mot de passe prod + « @ »"
fi

bash deploy/staging-env.sh .env.local

mkdir -p data public/uploads
chmod -R u+rwX data public/uploads 2>/dev/null || true

if [ ! -f data/artisans-enrichment.json ] && [ -f "$PROD_DIR/data/artisans-enrichment.json" ]; then
  echo "==> Copie base artisans depuis la prod (lecture seule initiale)"
  cp "$PROD_DIR/data/artisans-enrichment.json" data/artisans-enrichment.json
fi

if [ ! -f data/store.json ]; then
  echo "==> Copie store.json prod → staging (données de test)"
  if [ -f "$PROD_DIR/data/store.json" ]; then
    cp "$PROD_DIR/data/store.json" data/store.json
  else
    echo '{"clientAccounts":[],"proRegistrations":[],"workRequests":[],"bids":[],"auctions":[],"contactRequests":[],"contactUnlocks":[],"proDocuments":[],"proQuotes":[],"smsCampaigns":[],"smsSettings":{},"notifications":[],"emailVerificationTokens":[],"passwordResetTokens":[],"proCreditWallets":[],"proCreditTransactions":[]}' > data/store.json
  fi
fi

echo "==> npm ci + build"
npm ci
npm run build

echo "==> PM2 artipascher-dev (port 3002)"
pm2 delete artipascher-dev 2>/dev/null || true
pm2 start ecosystem.staging.config.cjs
pm2 save

echo "==> Nginx dev.nord-artisan-pro.com (Basic Auth)"
bash deploy/apply-dev-basic-auth.sh

echo ""
echo "✅ Staging prêt"
echo "   App      : http://127.0.0.1:3002 (local VPS)"
echo "   Accès    : https://dev.nord-artisan-pro.com (Basic Auth — deploy/dev-basic-auth)"
echo "   Deploy   : cd $STAGING_DIR && bash deploy/deploy-staging.sh"
echo "   Branche  : $BRANCH"
