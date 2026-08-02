# Artipascher

Plateforme d'**enchères inversées** pour travaux, spécialisée **Nord (59) / Pas-de-Calais (62)**.

Modèle inspiré de [encherestravaux.fr](https://encherestravaux.fr/) : le particulier fixe son budget, les artisans proposent des prix de plus en plus bas, le moins-disant remporte le chantier.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Accueil — hero, enchères, catégories, FAQ |
| `/particulier` | Espace particulier + formulaire demande |
| `/professionnel` | Espace artisan + inscription |
| `/encheres` | Liste des enchères actives Nord |
| `/encheres/[id]` | Détail d'une enchère |
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
- Approuver / refuser les **inscriptions artisans** (après vérif RCS + KBIS)
- Valider les **demandes travaux** des particuliers (création d'enchère)
- Suivre les **enchères actives**

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4

## Prochaines étapes

- Authentification particulier / pro
- Backend enchères en temps réel
- Validation KBIS et zone géographique 59/62
- Vérification SIRET / RCS via API entreprises (registre du commerce)
- Paiement / commission 10 % côté pro
