#!/usr/bin/env bash
# Restreint SSH (port 22) à une seule IP publique via UFW.
# Usage (sur le VPS, avec une session SSH déjà ouverte) :
#   sudo bash deploy/lock-ssh-to-ip.sh 109.30.111.204
#
# IMPORTANT : si ton IP box change, relance ce script avec la nouvelle IP
# ou tu seras bloqué. Garde la console OVH en secours.

set -euo pipefail

ALLOW_IP="${1:-}"
if [[ -z "$ALLOW_IP" ]]; then
  echo "Usage: sudo bash deploy/lock-ssh-to-ip.sh <IP_PUBLIQUE>"
  echo "Exemple: sudo bash deploy/lock-ssh-to-ip.sh 109.30.111.204"
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Relance avec sudo."
  exit 1
fi

if ! [[ "$ALLOW_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "IP invalide: $ALLOW_IP"
  exit 1
fi

echo "==> IP autorisée pour SSH : $ALLOW_IP"
echo "==> HTTP/HTTPS restent ouverts pour le site"

if ! command -v ufw >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y ufw
fi

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

ufw allow from "$ALLOW_IP" to any port 22 proto tcp comment "SSH admin home"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"

echo "y" | ufw enable
ufw status verbose

echo ""
echo "✅ SSH limité à $ALLOW_IP"
echo "   Pour changer d'IP : sudo bash deploy/lock-ssh-to-ip.sh NOUVELLE_IP"
echo "   Console OVH : secours si IP dynamique change"
