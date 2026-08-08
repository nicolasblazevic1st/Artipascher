#!/usr/bin/env bash
# Déploiement staging (branche dev) — /var/www/artipascher-dev, port 3001
# Usage sur le VPS : cd /var/www/artipascher-dev && bash deploy/deploy-staging.sh

set -euo pipefail

STAGING_DIR="/var/www/artipascher-dev"
cd "$STAGING_DIR"

BRANCH="${ARTIPASCHER_STAGING_BRANCH:-dev}"
ENRICHMENT="data/artisans-enrichment.json"
BACKUP=""

if [ "$(pwd)" != "$STAGING_DIR" ]; then
  echo "ERREUR: cwd=$(pwd) — attendu $STAGING_DIR"
  exit 1
fi

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

# Relance une fois si le script deploy a changé (évite ancienne version en mémoire)
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
  exec bash "$STAGING_DIR/deploy/deploy-staging.sh"
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

# Identifiant de build
{
  grep -v '^ARTIPASCHER_BUILD_ID=' .env.local 2>/dev/null || true
  printf 'ARTIPASCHER_BUILD_ID=%s\n' "$BUILD_ID"
} > .env.local.tmp.$$
mv .env.local.tmp.$$ .env.local

echo "==> clean .next + npm ci + build (buildId=$BUILD_ID)"
rm -rf .next
npm ci
ARTIPASCHER_BUILD_ID="$BUILD_ID" npm run build

mkdir -p data public/uploads
printf '%s\n' "$BUILD_ID" > public/build-id.txt

# Preuves que le build contient bien le nouveau code
echo "==> vérif artefacts .next"
if grep -R "Bêta ·" .next >/dev/null 2>&1; then
  echo "ERREUR: le titre 'Bêta ·' est encore dans .next — build contaminé"
  grep -R "Bêta ·" .next | head -5
  exit 1
fi
echo "   OK: pas de titre 'Bêta ·' dans .next"

if ! find .next -type f \( -name '*runtime-info*' -o -path '*runtime-info*' \) | head -1 | grep -q .; then
  echo "ERREUR: route runtime-info absente du build .next"
  exit 1
fi
echo "   OK: runtime-info présent dans .next"

echo "==> restart PM2 artipascher-dev (cwd forcé $STAGING_DIR)"
pm2 delete artipascher-dev 2>/dev/null || true
# Tuer tout ce qui écoute encore 3001
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3001/tcp 2>/dev/null || true
fi
sleep 1
ARTIPASCHER_BUILD_ID="$BUILD_ID" pm2 start "$STAGING_DIR/ecosystem.staging.config.cjs"
pm2 save

echo "==> PM2 exec cwd :"
pm2 show artipascher-dev | grep -iE 'cwd|script path|status|restarts|uptime' || true

# Attendre un process stable (pas de crash loop)
echo "==> attente démarrage Next…"
STABLE=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 2
  UP="$(pm2 jlist | node -e "
    const apps=JSON.parse(require('fs').readFileSync(0,'utf8'));
    const a=apps.find(x=>x.name==='artipascher-dev');
    if(!a){console.log('missing'); process.exit(0)}
    console.log([a.pm2_env.status, a.pm2_env.unstable_restarts||0, Math.floor((Date.now()-a.pm2_env.pm_uptime)/1000)].join(' '));
  " 2>/dev/null || echo missing)"
  echo "   try $i: $UP"
  STATUS="$(echo "$UP" | awk '{print $1}')"
  UNSTABLE="$(echo "$UP" | awk '{print $2}')"
  SECS="$(echo "$UP" | awk '{print $3}')"
  if [ "$STATUS" = "online" ] && [ "${UNSTABLE:-99}" -lt 3 ] && [ "${SECS:-0}" -ge 3 ]; then
    STABLE=1
    break
  fi
done

if [ "$STABLE" != "1" ]; then
  echo "ERREUR: artipascher-dev ne reste pas stable (crash loop ?)"
  echo "==> logs erreur (80 dernières lignes) :"
  pm2 logs artipascher-dev --err --lines 80 --nostream || true
  tail -n 80 /home/ubuntu/.pm2/logs/artipascher-dev-error-*.log 2>/dev/null || true
  exit 1
fi

echo "==> Nginx dev.artipascher.fr (accès IP uniquement)"
bash deploy/apply-dev-ip-lock.sh

echo "==> vérif proxy local"
TITLE_3001="$(curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/" | grep -o '<title>[^<]*</title>' | head -1 || true)"
TITLE_3000="$(curl -s -H "Host: artipascher.fr" "http://127.0.0.1:3000/" | grep -o '<title>[^<]*</title>' | head -1 || true)"
echo "   :3001 title: ${TITLE_3001:-'(vide)'}"
echo "   :3000 title: ${TITLE_3000:-'(vide)'}"

RUNTIME="$(curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/api/runtime-info" || true)"
echo "   runtime-info: $RUNTIME"

BUILD_TXT="$(curl -s -H "Host: dev.artipascher.fr" "http://127.0.0.1:3001/build-id.txt" || true)"
echo "   build-id.txt: $BUILD_TXT"

if echo "$TITLE_3001" | grep -q "Bêta ·"; then
  echo ""
  echo "ERREUR: :3001 sert encore l'ancien titre bêta."
  echo "Diagnostic :"
  pm2 show artipascher-dev | sed -n '1,40p'
  ss -lptn 'sport = :3001' || netstat -lptn | grep 3001 || true
  exit 1
fi

if ! echo "$RUNTIME" | grep -q '"beta":false'; then
  echo ""
  echo "ERREUR: /api/runtime-info n'indique pas beta:false"
  echo "$RUNTIME" | head -c 500
  exit 1
fi

echo "✅ Staging OK (dev.artipascher.fr:3001) — commit $BUILD_ID — $(date -Iseconds)"
