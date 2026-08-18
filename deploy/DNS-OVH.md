# Domaine nord-artisan-pro.com — configuration DNS + VPS

IP VPS actuelle : `137.74.172.131`

## 1. DNS (registrar du .com)

Chez ton registrar (OVH, Namecheap, Cloudflare, etc.) → zone DNS de **nord-artisan-pro.com** :

| Sous-domaine | Type | Cible | TTL |
|--------------|------|-------|-----|
| `@` (ou vide) | **A** | `137.74.172.131` | 3600 |
| `www` | **A** | `137.74.172.131` | 3600 |
| `dev` | **A** | `137.74.172.131` | 3600 |

| URL | Rôle | Port app |
|-----|------|----------|
| `https://nord-artisan-pro.com` | Production | 3000 |
| `https://dev.nord-artisan-pro.com` | Staging | 3002 |

Propagation : 15 min à 24 h (souvent &lt; 1 h).

```bash
nslookup nord-artisan-pro.com
nslookup dev.nord-artisan-pro.com
```

### Ancien domaine artipascher.fr (optionnel)
Après bascule, tu peux faire pointer `artipascher.fr` / `www` en **A** vers la même IP et activer la redirection 301 commentée dans `nginx.conf.example`.

---

## 2. VPS — variables d’environnement

**Prod** `/var/www/artipascher/.env.local` :

```env
ADMIN_PASSWORD=votre_mot_de_passe_fort
NEXT_PUBLIC_SITE_URL=https://nord-artisan-pro.com
PAYMENT_MODE=demo
```

**Staging** `/var/www/artipascher-dev/.env.local` :

```env
NEXT_PUBLIC_SITE_URL=https://dev.nord-artisan-pro.com
NEXT_PUBLIC_BETA_MODE=false
ARTIPASCHER_STAGING=1
```

Puis **rebuild** (obligatoire pour `NEXT_PUBLIC_*`) :

```bash
cd /var/www/artipascher && npm run build && pm2 restart artipascher
cd /var/www/artipascher-dev && npm run build && pm2 restart artipascher-dev
```

---

## 3. Nginx + HTTPS (Let’s Encrypt)

```bash
# Prod
sudo cp /var/www/artipascher/deploy/nginx.conf.example /etc/nginx/sites-available/nord-artisan-pro
sudo ln -sf /etc/nginx/sites-available/nord-artisan-pro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d nord-artisan-pro.com -d www.nord-artisan-pro.com

# Staging
sudo cp /var/www/artipascher-dev/deploy/nginx-staging.conf.example /etc/nginx/sites-available/nord-artisan-pro-dev
sudo ln -sf /etc/nginx/sites-available/nord-artisan-pro-dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dev.nord-artisan-pro.com
```

Ne supprime pas tout de suite l’ancien vhost `artipascher` tant que le DNS `.com` n’est pas propagé.

---

## 4. Checklist (SEO inclus)

- [ ] Domaine `nord-artisan-pro.com` acheté
- [ ] DNS A `@` / `www` / `dev` → `137.74.172.131` (**bloquant** aujourd’hui : parking OVH)
- [ ] Nginx prod + staging + SSL
- [ ] `.env.local` `NEXT_PUBLIC_SITE_URL=https://nord-artisan-pro.com` + **rebuild**
- [ ] 301 `artipascher.fr` → `nord-artisan-pro.com` (nginx déjà prévu)
- [ ] `robots.txt` : zones `/admin` `/pro` `/api` interdites ; sitemap OK
- [ ] Search Console : propriété nouveau domaine + sitemap
- [ ] Test : https://nord-artisan-pro.com + /sitemap.xml + /robots.txt
- [ ] Webhook Stripe → `https://dev.nord-artisan-pro.com/api/webhooks/stripe`

---

## 5. E-mail `contact@nord-artisan-pro.com` (OVH)

Deux usages :
1. **Boîte contact** — tu lis les messages des clients / artisans  
2. **Envoi technique** (OTP, reset MDP) — SMTP depuis le site (`noreply@…`)

### A. Créer l’offre mail + adresses (OVH Manager)
1. [OVH Manager](https://www.ovh.com/manager/) → **Web Cloud** → **Emails**  
   (ou **Noms de domaine** → `nord-artisan-pro.com` → **Emails**)
2. Attache une offre **MX Plan** / Emails au domaine `nord-artisan-pro.com` si ce n’est pas déjà fait
3. Crée les comptes :
   - `contact@nord-artisan-pro.com` — boîte que tu consultes (Webmail / Outlook / Gmail)
   - `noreply@nord-artisan-pro.com` — pour l’envoi du site (même mdp ou compte dédié)

Webmail OVH : https://www.ovh.com/fr/mail/

### B. DNS mail (souvent auto avec MX Plan)
Vérifie dans la zone DNS du `.com` :

| Type | Nom | Cible (exemple OVH) |
|------|-----|---------------------|
| **MX** | `@` | `mx1.mail.ovh.net` (priorité 1) + `mx2` / `mx3` |
| **TXT** | `@` | `v=spf1 include:mx.ovh.com ~all` (SPF) |

Sans MX correct, les mails n’arrivent pas.

### C. Brancher le site (SMTP)
Dans `/var/www/artipascher/.env.local` (et staging si besoin) :

```env
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=587
SMTP_USER=noreply@nord-artisan-pro.com
SMTP_PASS=mot_de_passe_noreply
EMAIL_FROM=Nord Artisan Pro <noreply@nord-artisan-pro.com>
```

Les mentions légales affichent déjà `contact@nord-artisan-pro.com` (`src/lib/brand.ts`).

### D. Astuce
Tu peux faire **rediriger** `contact@` vers ton Gmail dans OVH (Emails → Redirections) tout en gardant l’adresse pro visible.

### Checklist mail
- [ ] MX Plan / emails actifs sur `nord-artisan-pro.com`
- [ ] Compte `contact@nord-artisan-pro.com`
- [ ] Compte `noreply@…` + SMTP dans `.env.local`
- [ ] Test : envoi inscription / reset MDP
- [ ] Test : recevoir un mail sur `contact@`

