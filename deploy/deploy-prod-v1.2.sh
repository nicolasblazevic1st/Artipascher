#!/usr/bin/env bash
# Déploiement prod tag v1.2 — /var/www/artipascher, port 3001
set -euo pipefail

PROD_DIR="/var/www/artipascher"
TAG="v1.2"
cd "$PROD_DIR"

echo "==> cwd=$PROD_DIR"
test -f .env.local

BACKUP="/tmp/artipascher.env.local.bak.$(date +%s)"
cp -a .env.local "$BACKUP"
echo "==> backup env -> $BACKUP"

# Conserver data métier
mkdir -p data public/uploads

echo "==> git fetch tags"
git fetch --tags origin
git fetch origin

echo "==> avant: $(git rev-parse --short HEAD) $(git describe --tags --always 2>/dev/null || true)"
git status -sb || true

# Ne pas perdre les enrichissements locaux éventuels
ENRICHMENT="data/artisans-enrichment.json"
ENRICH_BAK=""
if [ -f "$ENRICHMENT" ]; then
  ENRICH_BAK="/tmp/artisans-enrichment-prod.$(date +%s).json"
  cp -a "$ENRICHMENT" "$ENRICH_BAK"
  echo "==> backup enrichment -> $ENRICH_BAK"
fi

echo "==> checkout $TAG"
git checkout -f "$TAG"

cp -a "$BACKUP" .env.local

# SITE_URL Nord Artisan Pro (prod)
if grep -q '^NEXT_PUBLIC_SITE_URL=' .env.local; then
  # garder une seule entrée
  awk -F= '
    BEGIN { done=0 }
    $1=="NEXT_PUBLIC_SITE_URL" {
      if (!done) { print "NEXT_PUBLIC_SITE_URL=https://nord-artisan-pro.com"; done=1 }
      next
    }
    { print }
    END { if (!done) print "NEXT_PUBLIC_SITE_URL=https://nord-artisan-pro.com" }
  ' .env.local > .env.local.tmp
  mv .env.local.tmp .env.local
else
  printf '\nNEXT_PUBLIC_SITE_URL=https://nord-artisan-pro.com\n' >> .env.local
fi

if [ -n "$ENRICH_BAK" ] && [ -f "$ENRICH_BAK" ] && [ -f "$ENRICHMENT" ]; then
  if command -v node >/dev/null && [ -f scripts/merge-artisans-enrichment.mjs ]; then
    echo "==> merge enrichment"
    node scripts/merge-artisans-enrichment.mjs "$ENRICH_BAK" "$ENRICHMENT" || cp -a "$ENRICH_BAK" "$ENRICHMENT"
  else
    cp -a "$ENRICH_BAK" "$ENRICHMENT"
  fi
elif [ -n "$ENRICH_BAK" ] && [ -f "$ENRICH_BAK" ]; then
  mkdir -p data
  cp -a "$ENRICH_BAK" "$ENRICHMENT"
fi

BUILD_ID="$(git rev-parse --short HEAD)"
{
  grep -v '^ARTIPASCHER_BUILD_ID=' .env.local || true
  printf 'ARTIPASCHER_BUILD_ID=%s\n' "$BUILD_ID"
} > .env.local.tmp.$$
mv .env.local.tmp.$$ .env.local

echo "==> version $(node -p "require('./package.json').version") tag=$(git describe --tags --always)"
echo "==> SITE_URL=$(grep '^NEXT_PUBLIC_SITE_URL=' .env.local | head -1)"

echo "==> npm ci + build"
rm -rf .next
npm ci
ARTIPASCHER_BUILD_ID="$BUILD_ID" npm run build
printf '%s\n' "$BUILD_ID" > public/build-id.txt

echo "==> vérifs build"
if grep -R "Artipascher — Bêta" .next >/dev/null 2>&1; then
  echo "ERREUR: titre Artipascher bêta encore dans .next"
  exit 1
fi
if ! grep -R "Nord Artisan Pro" .next >/dev/null 2>&1; then
  echo "ERREUR: 'Nord Artisan Pro' introuvable dans .next"
  exit 1
fi

echo "==> pm2 restart artipascher"
pm2 restart artipascher --update-env
sleep 2
pm2 show artipascher | head -25

echo "==> smoke"
curl -sI --max-time 10 --resolve www.nord-artisan-pro.com:443:127.0.0.1 https://www.nord-artisan-pro.com/ | head -8
BODY="$(curl -s --max-time 15 --resolve www.nord-artisan-pro.com:443:127.0.0.1 https://www.nord-artisan-pro.com/ | tr '\n' ' ' | sed 's/<[^>]*>/ /g' | tr -s ' ' | cut -c1-400)"
echo "$BODY"
echo
echo "==> DONE v1.2 ($BUILD_ID)"
