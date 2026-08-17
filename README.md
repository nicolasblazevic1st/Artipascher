# Nord Artisan Pro

> Marque commerciale : **Nord Artisan Pro**. Le dossier / dépôt Git peut encore s’appeler `Artipascher` (chemins VPS `/var/www/artipascher`, variables `ARTIPASCHER_*`).

Plateforme d'**enchères inversées** pour travaux, spécialisée **Nord (59) / Pas-de-Calais (62)**.

Modèle inspiré de [encherestravaux.fr](https://encherestravaux.fr/) : le particulier fixe son budget, les artisans proposent des prix de plus en plus bas, puis le client choisit librement son artisan.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Accueil — hero, enchères, catégories, FAQ |
| `/particulier` | Espace particulier + formulaire demande |
| `/professionnel` | Espace artisan + inscription |
| `/encheres` | Liste des enchères actives Nord |
| `/encheres/[id]` | Détail d'une enchère |
| `/comment-ca-marche` | Présentation animée (~90 s) |
| `/enchere/partage/[token]` | Page publique partage enchère |
| `/particulier/espace` | Espace client (demandes, devis) |
| `/pro` | Espace artisan |
| `/admin/devis` | Modération des devis après visite |
| `/faq` | Questions fréquentes |
| `/admin` | **Administration** — tableau de bord |
| `/admin/login` | Connexion admin |
| `/admin/professionnels` | Valider inscriptions artisans RCS |
| `/admin/demandes` | Valider demandes particuliers → enchères |
| `/admin/encheres` | Suivi des enchères |

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Administration

1. Copier `.env.local.example` vers `.env.local`
2. Aller sur [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
3. Mot de passe par défaut : `artipascher2026` (modifiable via `ADMIN_PASSWORD`)

Fonctions admin :
- Approuver / refuser les **inscriptions artisans** (après vérif RCS + BODACC + docs)
- Valider les **demandes travaux** des particuliers (création d'enchère)
- Modérer les **devis** déposés après visite sur chantier
- Suivre les **enchères actives**

## Déploiement VPS (OVH)

Persistance locale : `data/store.json` et `public/uploads/` (non versionnés).

**Première installation sur le serveur :**

```bash
sudo bash deploy/setup-vps.sh
nano /var/www/artipascher/.env.local   # ADMIN_PASSWORD, NEXT_PUBLIC_SITE_URL, PAYMENT_MODE
```

**Nginx + HTTPS :** voir `deploy/DNS-OVH.md` et `deploy/nginx.conf.example`, puis `certbot --nginx -d nord-artisan-pro.com -d www.nord-artisan-pro.com`.

**Mises à jour après un push GitHub :**

```bash
cd /var/www/artipascher && bash deploy/deploy.sh
```

L'app écoute sur le port **3000** (PM2 via `ecosystem.config.cjs`).

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4

## Parcours métier

1. Particulier → demande validée → enchère inversée
2. Artisan → contact (1 €) → visite → **devis** (modération admin)
3. Devis approuvé → enchère (cohérente avec le devis) → client choisit l'artisan
