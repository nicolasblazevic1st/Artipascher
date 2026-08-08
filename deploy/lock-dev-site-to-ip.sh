#!/usr/bin/env bash
# Restreint dev.artipascher.fr à une ou plusieurs IP (Nginx).
# Usage : sudo bash deploy/lock-dev-site-to-ip.sh 109.30.111.204 [autre-ip…]
#
# Le site prod (artipascher.fr) n'est pas modifié.
# Let's Encrypt : /.well-known/acme-challenge/ reste ouvert pour le renouvellement.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: sudo bash deploy/lock-dev-site-to-ip.sh <IP_PUBLIQUE> [IP2…]"
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Relance avec sudo."
  exit 1
fi

NGINX_SITE="/etc/nginx/sites-available/artipascher-dev"
DOMAIN="dev.artipascher.fr"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
WEBROOT="/var/www/html"
# Staging Next écoute sur 3002 (3001 souvent bloqué par un zombie next-server)
PROXY_COMMON="        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;"

ALLOW_LINES=""
for ip in "$@"; do
  if ! [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "IP invalide: $ip"
    exit 1
  fi
  ALLOW_LINES="${ALLOW_LINES}        allow ${ip};
"
done

mkdir -p "$WEBROOT"

write_proxy_location() {
  printf '%s\n' "    location / {"
  printf '%s' "$ALLOW_LINES"
  printf '%s\n' "        deny all;"
  printf '%s\n' ""
  printf '%s\n' "$PROXY_COMMON"
  printf '%s\n' "    }"
}

{
  echo "# Généré par deploy/lock-dev-site-to-ip.sh — $(date -Iseconds)"
  echo "# Accès dev limité aux IP autorisées. Prod inchangée."
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
echo "✅ ${DOMAIN} limité aux IP : $*"
echo "   Prod artipascher.fr : inchangée"
echo "   Changer d'IP : sudo bash deploy/lock-dev-site-to-ip.sh NOUVELLE_IP"
