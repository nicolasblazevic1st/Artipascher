#!/usr/bin/env bash
# Applique la Basic Auth Nginx sur dev.artipascher.fr (staging).
# Usage : bash deploy/apply-dev-basic-auth.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Basic Auth Nginx → https://dev.artipascher.fr"
sudo bash deploy/lock-dev-basic-auth.sh
