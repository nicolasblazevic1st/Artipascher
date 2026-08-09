#!/usr/bin/env bash
# Variables .env.local obligatoires pour le staging (dev.artipascher.fr).
# Usage : bash deploy/staging-env.sh [.env.local]

set -euo pipefail

ENV_FILE="${1:-.env.local}"

if [ ! -f "$ENV_FILE" ]; then
  cp deploy/env.staging.example "$ENV_FILE"
fi

set_env() {
  local key="$1"
  local value="$2"
  local tmp="${ENV_FILE}.tmp.$$"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  else
    cp "$ENV_FILE" "$tmp" 2>/dev/null || : > "$tmp"
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
}

set_env NEXT_PUBLIC_SITE_URL "https://dev.artipascher.fr"
set_env NEXT_PUBLIC_BETA_MODE "false"
set_env NEXT_PUBLIC_ARTIPASCHER_STAGING "1"
set_env ARTIPASCHER_STAGING "1"
set_env BETA_MODE "false"
# Stripe test (sandbox) — pas de clés live sur le staging
set_env PAYMENT_MODE "stripe"
set_env GOOGLE_PLACES_ENABLED "false"
set_env OVH_SMS_ENABLED "false"

echo "==> $ENV_FILE staging : BETA off, ARTIPASCHER_STAGING=1, parcours complets activés"
