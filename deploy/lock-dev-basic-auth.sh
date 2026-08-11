#!/usr/bin/env bash
# Protège dev.artipascher.fr par Basic Auth Nginx (plus de lock IP).
# Usage : sudo bash deploy/lock-dev-basic-auth.sh
#
# Identifiants (premier trouvé gagne) :
#   - ARTIPASCHER_DEV_AUTH_USER + ARTIPASCHER_DEV_AUTH_PASS
#   - deploy/dev-basic-auth  (une ligne : user:password)
#
# Le site prod (artipascher.fr) n'est pas modifié.
# Stripe webhook + ACME restent sans Basic Auth.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Relance avec sudo."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH_FILE="${ROOT}/deploy/dev-basic-auth"
NGINX_SITE="/etc/nginx/sites-available/artipascher-dev"
HTPASSWD_FILE="/etc/nginx/.htpasswd-artipascher-dev"
DOMAIN="dev.artipascher.fr"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
WEBROOT="/var/www/html"

AUTH_USER="${ARTIPASCHER_DEV_AUTH_USER:-}"
AUTH_PASS="${ARTIPASCHER_DEV_AUTH_PASS:-}"

if [ -z "$AUTH_USER" ] || [ -z "$AUTH_PASS" ]; then
  if [ -f "$AUTH_FILE" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
      line="${line%%#*}"
      line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
      [ -z "$line" ] && continue
      case "$line" in
        *:*)
          AUTH_USER="${line%%:*}"
          AUTH_PASS="${line#*:}"
          break
          ;;
      esac
    done < "$AUTH_FILE"
  fi
fi

if [ -z "${AUTH_USER}" ] || [ -z "${AUTH_PASS}" ]; then
  echo "ERREUR: identifiants Basic Auth manquants."
  echo "  Créez ${AUTH_FILE} (voir deploy/dev-basic-auth.example)"
  echo "  ou exportez ARTIPASCHER_DEV_AUTH_USER / ARTIPASCHER_DEV_AUTH_PASS"
  exit 1
fi

if ! command -v htpasswd >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y apache2-utils
fi

mkdir -p "$WEBROOT"
htpasswd -bc "$HTPASSWD_FILE" "$AUTH_USER" "$AUTH_PASS"
chmod 640 "$HTPASSWD_FILE"
chown root:www-data "$HTPASSWD_FILE" 2>/dev/null || chown root:nginx "$HTPASSWD_FILE" 2>/dev/null || true

PROXY_COMMON="        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;"

write_proxy_location() {
  printf '%s\n' "    location = /api/webhooks/stripe {"
  printf '%s\n' "        # Pas de Basic Auth — Stripe doit POSTer librement"
  printf '%s\n' "        auth_basic off;"
  printf '%s\n' ""
  printf '%s\n' "$PROXY_COMMON"
  printf '%s\n' "    }"
  printf '%s\n' ""
  printf '%s\n' "    location / {"
  printf '%s\n' "        auth_basic \"Artipascher staging\";"
  printf '%s\n' "        auth_basic_user_file ${HTPASSWD_FILE};"
  printf '%s\n' ""
  printf '%s\n' "$PROXY_COMMON"
  printf '%s\n' "    }"
}

{
  echo "# Généré par deploy/lock-dev-basic-auth.sh — $(date -Iseconds)"
  echo "# Accès dev via Basic Auth. Prod inchangée."
  echo ""
  echo "server {"
  echo "    listen 80;"
  echo "    listen [::]:80;"
  echo "    server_name ${DOMAIN};"
  echo ""
  echo "    location ^~ /.well-known/acme-challenge/ {"
  echo "        root ${WEBROOT};"
  echo "        allow all;"
  echo "    }"
  echo ""

  if [ -f "$CERT" ] && [ -f "$KEY" ]; then
    echo "    location / {"
    echo "        return 301 https://\$host\$request_uri;"
    echo "    }"
    echo "}"
    echo ""
    echo "server {"
    echo "    listen 443 ssl;"
    echo "    listen [::]:443 ssl;"
    echo "    server_name ${DOMAIN};"
    echo ""
    echo "    ssl_certificate ${CERT};"
    echo "    ssl_certificate_key ${KEY};"
    echo "    include /etc/letsencrypt/options-ssl-nginx.conf;"
    echo "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
    echo ""
    echo "    client_max_body_size 20M;"
    echo ""
    echo "    location ^~ /.well-known/acme-challenge/ {"
    echo "        root ${WEBROOT};"
    echo "        allow all;"
    echo "    }"
    echo ""
    write_proxy_location
    echo "}"
  else
    echo "    client_max_body_size 20M;"
    echo ""
    write_proxy_location
    echo "}"
  fi
} > "$NGINX_SITE"

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/artipascher-dev
nginx -t
systemctl reload nginx

echo ""
echo "✅ ${DOMAIN} protégé par Basic Auth (user: ${AUTH_USER})"
echo "   Prod artipascher.fr : inchangée"
echo "   Webhook Stripe + ACME : sans mot de passe"
echo "   Changer le mdp : éditer deploy/dev-basic-auth puis relancer ce script"
