# Domaine artipascher.fr — configuration OVH

## 1. DNS (Zone DNS du domaine)

Dans [OVH Manager](https://www.ovh.com/manager/) → **Noms de domaine** → **artipascher.fr** → **Zone DNS** :

| Sous-domaine | Type | Cible | TTL |
|--------------|------|-------|-----|
| `@` (ou vide) | **A** | `IP_DE_TON_VPS` | 3600 |
| `www` | **A** | `IP_DE_TON_VPS` | 3600 |
| `dev` | **A** | `IP_DE_TON_VPS` | 3600 |

Le sous-domaine **`dev`** sert l’environnement de développement (`dev.artipascher.fr` → port 3001). Voir `deploy/STAGING.md`.

Remplace `IP_DE_TON_VPS` par l’IPv4 de ton serveur OVH (ex. `51.xxx.xxx.xxx`).

Propagation DNS : 15 min à 24 h (souvent &lt; 1 h).

Vérifier :

```bash
ping artipascher.fr
nslookup artipascher.fr
```

---

## 2. VPS — variables d’environnement

Fichier `/var/www/artipascher/.env.local` :

```env
ADMIN_PASSWORD=votre_mot_de_passe_fort
NEXT_PUBLIC_SITE_URL=https://artipascher.fr
PAYMENT_MODE=demo
```

Puis **rebuild** (obligatoire pour `NEXT_PUBLIC_*`) :

```bash
cd /var/www/artipascher
npm run build
pm2 restart artipascher
```

---

## 3. Nginx + HTTPS (Let’s Encrypt)

```bash
sudo cp /var/www/artipascher/deploy/nginx.conf.example /etc/nginx/sites-available/artipascher
sudo ln -sf /etc/nginx/sites-available/artipascher /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d artipascher.fr -d www.artipascher.fr
```

Certbot configure automatiquement le HTTPS et la redirection HTTP → HTTPS.

---

## 4. Redirection www (optionnel)

Le fichier `deploy/nginx.conf.example` inclut déjà `www.artipascher.fr`. Certbot gère les deux noms.

Pour forcer **toujours** `https://artipascher.fr` (sans www), ajoutez après le bloc SSL :

```nginx
server {
    listen 443 ssl;
    server_name www.artipascher.fr;
    return 301 https://artipascher.fr$request_uri;
}
```

---

## 5. Checklist mise en ligne

- [ ] DNS A → IP VPS
- [ ] `git pull` + `bash deploy/deploy.sh` sur le VPS
- [ ] `.env.local` avec `NEXT_PUBLIC_SITE_URL=https://artipascher.fr`
- [ ] Nginx actif
- [ ] Certificat SSL (cadenas vert)
- [ ] Test : https://artipascher.fr
- [ ] Test partage : créer une enchère → lien `/enchere/partage/...` en `https://artipascher.fr/...`
- [ ] Admin : https://artipascher.fr/admin/login

---

## E-mail (plus tard)

Pour `contact@artipascher.fr` : OVH → **MX** + boîtes mail OVH ou redirection vers Gmail.
