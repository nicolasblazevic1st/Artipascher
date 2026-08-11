#!/usr/bin/env bash
# One-shot KVM : Basic Auth staging + SSH ouvert + (optionnel) deploy.
# Usage sur le VPS :
#   cd /var/www/artipascher-dev
#   # créer deploy/dev-basic-auth si absent
#   sudo bash deploy/apply-staging-simple-access.sh
#   # avec pubkey PC :
#   sudo bash deploy/apply-staging-simple-access.sh /tmp/id_ed25519_vps.pub

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBKEY="${1:-}"

if [ ! -f deploy/dev-basic-auth ]; then
  if [ -f deploy/dev-basic-auth.example ]; then
    echo "ERREUR: créez deploy/dev-basic-auth avant (copiez l'example et changez le mot de passe)."
    echo "  cp deploy/dev-basic-auth.example deploy/dev-basic-auth && nano deploy/dev-basic-auth"
  else
    echo "ERREUR: deploy/dev-basic-auth manquant."
  fi
  exit 1
fi

echo "==> 1/2 Basic Auth Nginx"
sudo bash deploy/lock-dev-basic-auth.sh

echo "==> 2/2 SSH ouvert"
if [ -n "$PUBKEY" ]; then
  sudo bash deploy/open-ssh.sh "$PUBKEY"
else
  sudo bash deploy/open-ssh.sh
fi

echo ""
echo "✅ Accès simplifié appliqué."
echo "   Web : https://dev.artipascher.fr (prompt Basic Auth)"
echo "   SSH : port 22 ouvert (clés uniquement)"
echo "   Deploy : bash deploy/deploy-staging.sh"
