# Environnement dev / staging (VPS)

Développement sur **`dev.nord-artisan-pro.com`** (port 3002), production inchangée sur **`nord-artisan-pro.com`** (port 3000).

## DNS (OVH)

| Sous-domaine | Type | Cible |
|--------------|------|-------|
| `dev` | **A** | IP du VPS (`137.74.172.131`) |

## Workflow

1. Travailler sur la branche **`dev`** en local ou push direct.
2. Sur le VPS staging :
   ```bash
   cd /var/www/artipascher-dev && bash deploy/deploy-staging.sh
   ```
3. Quand c’est validé → merge `dev` → `master` → prod :
   ```bash
   cd /var/www/artipascher && bash deploy/deploy.sh
   ```

## Premier setup (une fois)

```bash
cd /var/www/artipascher
git pull origin master
bash deploy/setup-staging.sh
sudo certbot --nginx -d dev.nord-artisan-pro.com
```

## Différences staging vs prod

| | Prod | Staging |
|---|------|---------|
| Dossier | `/var/www/artipascher` | `/var/www/artipascher-dev` |
| Branche | `master` | `dev` |
| PM2 | `artipascher` :3000 | `artipascher-dev` :3002 |
| Places / SMS | selon `.env` prod | **désactivés** |
| Paiement | stripe (live) | **stripe test** (`sk_test`) |
| Mode bêta | bordereau + blocages | **désactivé** (`NEXT_PUBLIC_BETA_MODE=false`) |
| Crons | actifs | **ne pas configurer** sur staging |
| Admin | `ADMIN_PASSWORD` prod | **même mot de passe + `@`** |
| Accès web | public | **Basic Auth Nginx** (voir ci-dessous) |

Données `data/` **séparées** (copie initiale depuis prod au setup, puis évolution indépendante).

## Accès web staging (Basic Auth)

Le staging est accessible depuis n’importe quelle IP, protégé par **mot de passe HTTP** (pas de lock IP).

```bash
cp deploy/dev-basic-auth.example deploy/dev-basic-auth
nano deploy/dev-basic-auth   # user:password
bash deploy/apply-dev-basic-auth.sh
```

Chaque `deploy-staging.sh` / `fix-staging-now.sh` réapplique cette Basic Auth.

Exceptions **sans** mot de passe :

- `POST /api/webhooks/stripe` (webhooks Stripe test)
- `/.well-known/acme-challenge/` (Let's Encrypt)

La **prod** (`nord-artisan-pro.com`) reste publique.

## SSH (ouvert + clés uniquement)

Pour éviter les blocages KVM quand l’IP box change :

```bash
# Une fois (console OVH ou session déjà ouverte)
sudo bash deploy/open-ssh.sh /chemin/vers/id_ed25519_vps.pub
```

Ou one-shot complet (Basic Auth + SSH) :

```bash
cd /var/www/artipascher-dev
cp deploy/dev-basic-auth.example deploy/dev-basic-auth && nano deploy/dev-basic-auth
# coller la pubkey PC dans /tmp/id_ed25519_vps.pub
sudo bash deploy/apply-staging-simple-access.sh /tmp/id_ed25519_vps.pub
bash deploy/deploy-staging.sh
```

`open-ssh.sh` ouvre le port 22 dans UFW et force `PasswordAuthentication no`.
