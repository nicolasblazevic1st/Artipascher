#!/usr/bin/env bash
# Ouvre SSH (port 22) depuis Internet via UFW + force auth par clé.
# Usage (sur le VPS) : sudo bash deploy/open-ssh.sh [chemin_pubkey.pub]
#
# Moins sûr qu'un lock IP : gardez PasswordAuthentication no.
# Console OVH reste le secours.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Relance avec sudo."
  exit 1
fi

PUBKEY_FILE="${1:-}"

if ! command -v ufw >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y ufw
fi

echo "==> UFW : SSH/HTTP/HTTPS ouverts, reste deny incoming"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
echo "y" | ufw enable
ufw status verbose

SSHD_CONFIG="/etc/ssh/sshd_config"
SSHD_DROPIN_DIR="/etc/ssh/sshd_config.d"
mkdir -p "$SSHD_DROPIN_DIR"
DROPIN="${SSHD_DROPIN_DIR}/99-artipascher-key-only.conf"
cat > "$DROPIN" <<'EOF'
# Généré par deploy/open-ssh.sh — auth par clé uniquement
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
EOF

if grep -qE '^PasswordAuthentication\s+' "$SSHD_CONFIG"; then
  sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
fi

if systemctl is-active --quiet ssh 2>/dev/null; then
  systemctl reload ssh || systemctl reload sshd || true
elif systemctl is-active --quiet sshd 2>/dev/null; then
  systemctl reload sshd || true
fi

install_pubkey_for_user() {
  local user="$1"
  local pubkey="$2"
  local home
  home="$(getent passwd "$user" | cut -d: -f6 || true)"
  [ -n "$home" ] || return 0
  [ -d "$home" ] || return 0
  mkdir -p "${home}/.ssh"
  chmod 700 "${home}/.ssh"
  touch "${home}/.ssh/authorized_keys"
  chmod 600 "${home}/.ssh/authorized_keys"
  if ! grep -qxF "$pubkey" "${home}/.ssh/authorized_keys"; then
    echo "$pubkey" >> "${home}/.ssh/authorized_keys"
    echo "   + clé ajoutée pour ${user}"
  else
    echo "   = clé déjà présente pour ${user}"
  fi
  chown -R "${user}:${user}" "${home}/.ssh" 2>/dev/null || true
}

if [ -n "$PUBKEY_FILE" ]; then
  if [ ! -f "$PUBKEY_FILE" ]; then
    echo "ERREUR: pubkey introuvable: $PUBKEY_FILE"
    exit 1
  fi
  PUBKEY="$(tr -d '\r\n' < "$PUBKEY_FILE")"
  echo "==> Installation clé SSH"
  install_pubkey_for_user artipascher "$PUBKEY"
  install_pubkey_for_user ubuntu "$PUBKEY" || true
  install_pubkey_for_user root "$PUBKEY" || true
fi

echo ""
echo "✅ SSH ouvert (0.0.0.0:22) — PasswordAuthentication no"
echo "   Installer une clé : sudo bash deploy/open-ssh.sh /chemin/id_ed25519.pub"
echo "   Prod web : inchangée"
