#!/usr/bin/env bash
# Applique le verrouillage IP Nginx sur dev.artipascher.fr (obligatoire staging).
# Lit deploy/allowed-dev-ip (une IPv4 par ligne) ou ARTIPASCHER_DEV_ALLOW_IP.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALLOW_FILE="deploy/allowed-dev-ip"
IPS=()

if [ -n "${ARTIPASCHER_DEV_ALLOW_IP:-}" ]; then
  IPS+=("$ARTIPASCHER_DEV_ALLOW_IP")
fi

if [ -f "$ALLOW_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="$(echo "$line" | tr -d '[:space:]')"
    [ -z "$line" ] && continue
    IPS+=("$line")
  done < "$ALLOW_FILE"
fi

if [ $# -gt 0 ]; then
  IPS=("$@")
fi

if [ ${#IPS[@]} -eq 0 ]; then
  echo "ERREUR: aucune IP autorisée pour dev.artipascher.fr"
  echo "  Créez deploy/allowed-dev-ip (voir allowed-dev-ip.example)"
  echo "  ou : sudo bash deploy/apply-dev-ip-lock.sh VOTRE_IP"
  exit 1
fi

echo "==> Verrouillage dev.artipascher.fr → ${IPS[*]}"
sudo bash deploy/lock-dev-site-to-ip.sh "${IPS[@]}"
