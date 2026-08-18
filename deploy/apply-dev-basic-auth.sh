#!/usr/bin/env bash
# Applique la Basic Auth Nginx sur dev.nord-artisan-pro.com (staging).
# Usage : bash deploy/apply-dev-basic-auth.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Basic Auth Nginx → https://dev.nord-artisan-pro.com"
sudo bash deploy/lock-dev-basic-auth.sh
