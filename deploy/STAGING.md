# Environnement dev / staging (VPS)

Développement sur **`dev.artipascher.fr`** (port 3001), production inchangée sur **`artipascher.fr`** (port 3000).

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
sudo certbot --nginx -d dev.artipascher.fr
```

## Différences staging vs prod

| | Prod | Staging |
|---|------|---------|
| Dossier | `/var/www/artipascher` | `/var/www/artipascher-dev` |
| Branche | `master` | `dev` |
| PM2 | `artipascher` :3000 | `artipascher-dev` :3001 |
| Places / SMS | selon `.env` prod | **désactivés** |
| Paiement | stripe ou demo | **demo** |
| Crons | actifs | **ne pas configurer** sur staging |
| Admin | `ADMIN_PASSWORD` prod | **même mot de passe + `@`** |

Données `data/` **séparées** (copie initiale depuis prod au setup, puis évolution indépendante).
