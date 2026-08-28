# Kit Google Ads — 1 ville × 14 métiers

Copier-coller pour créer une campagne **Recherche** par petite commune (59 / 62), puis la dupliquer.

**Message à faire passer dans l’annonce Google** (avant le clic), toujours ce format :

> **Peintre sur Lille — Formulaire à remplir**  
> nord-artisan-pro.com/Lille/Formulaire

Remplace le métier et la ville selon le groupe (`Plombier sur Bailleul`, `Couvreur sur Bergues`…).

- Marque : **Nord Artisan Pro**
- Site : `https://nord-artisan-pro.com`
- Page d’arrivée **accueil** : `https://nord-artisan-pro.com/` — le visiteur voit le site, puis clique vers le formulaire. `utm_content` / `utm_term={keyword}` servent d’**indice** pour orienter vers le bon métier (plus de grille à cocher : le particulier décrit le projet, indique la ville, confirme le mobile).
- Alias **uniquement** pour les pubs / anciens liens déjà envoyés vers `/travaux` (même formulaire). Pas dans le menu ni le sitemap.
- Hors pub (restent sur le site, pas de groupe) : Rénovation énergétique, Rénovation complète

Remplace partout `{Ville}` par le nom de la commune (ex. `Bailleul`).  
Remplace `{ville-slug}` par le nom en minuscules, sans accent, tirets (ex. `bailleul`, `aire-sur-la-lys`).

### Campagne déjà en ligne — quoi changer (ne pas recréer)

1. Ouvre chaque groupe → l’annonce RSA → **Modifier**.
2. **Supprime** les titres `Publiez sans frais`, `Mise en relation`, `Trouvez un …`, `Demande sans frais`.
3. **Ajoute** les titres partagés §6 (surtout `Formulaire à remplir`).
4. **Épingle** (icône punaise) — sinon Google n’affiche pas les deux bouts :
   - Titre **position 1** : `{Métier} sur {Ville}` (ex. `Peintre sur Lille`)
   - Titre **position 2** : `Formulaire à remplir`
   - Titre **position 3** : `Artisans vérifiés` (optionnel)
5. Remplace les 4 descriptions par celles du §6 + 2 descriptions métier.
6. Chemin d’affichage 2 : `Formulaire` (à la place du métier).
7. Enregistre. Pas besoin de changer mots-clés, budget, zones ni URL métier.

---

## 1. Avant de commencer

1. Compte Google Ads **Nord Artisan Pro** (pas StopArnaqueHDF).
2. Interface en **mode Expert** (pas le mode « Smart » simplifié). En bas à gauche : *Passer en mode Expert* si besoin.
3. Campagne existante inutilisable → **Pause**, ne pas supprimer.
4. Une seule ville pilote pour la première campagne. Ensuite on duplique.

Limites Google à respecter :

| Élément | Maximum |
|---|---|
| Titre (headline) | 30 caractères |
| Description | 90 caractères |
| Chemin d’affichage | 15 caractères chacun |

Si `{Métier} sur {Ville}` dépasse 30 caractères, utilise le **nom court** du tableau §10 (ex. Saint-Pol-sur-Ternoise → `Saint-Pol`, Aire-sur-la-Lys → `Aire`). Les mots-clés et le ciblage geo gardent le nom complet. Ex. `Électricien sur Aire-sur-la-Lys` = 32 → `Électricien sur Aire`.

Ne mets **pas** `{Ville}` dans les descriptions (limite 90 car. trop juste). La ville est déjà dans les titres, les mots-clés et le rayon.

---

## 2. Checklist — créer la campagne (écran par écran)

### 2.1 Nouvelle campagne

1. Menu **Campagnes** → bouton **+** → **Nouvelle campagne**
2. Objectif : **Création de contacts** (sinon **Trafic vers le site**)
3. Type : **Recherche**
4. Nom : `LOC - {Ville} - Recherche`
5. Continue

### 2.2 Réseaux (important)

Décoche :

- **Réseau Display**
- **Partenaires du réseau de recherche** (recommandé au début)

Garde uniquement **Recherche Google**.

### 2.3 Zones géographiques

1. **Choisir une autre zone** (pas la France entière)
2. Cherche `{Ville}` → ajoute la commune
3. Ajoute un **rayon de 12 km** autour de la commune (ciblage par rayon / proximité)
4. Options de localisation : **Présence : personnes se trouvant (ou résidant régulièrement) dans vos zones**  
   Ne pas laisser « Présence ou intérêt »

### 2.4 Langues, budget, enchères

- Langues : **français**
- Budget : **8 à 12 € / jour** (plafond mensuel ≈ budget × 30)
- Enchères : **Maximiser les clics**
- Plafond CPC : **1,50 à 2,50 €** (à activer si Google le propose ; sinon règle d’enchère manuelle équivalente)
- Pas de Smart Bidding (CPA / conversions) tant qu’il n’y a pas assez de demandes

### 2.5 Conversion

Si ce n’est pas déjà lié : importer depuis GA4 l’événement `manual_event_SUBMIT_LEAD_FORM` (envoi du formulaire de demande).  
Les annonces (métier ou générique) pointent vers `/particulier/demande` : le particulier décrit le projet ; `utm_content` / `utm_term={keyword}` aident à orienter le métier.

### 2.6 Groupes d’annonces

Crée **14 groupes** (un par métier ci-dessous).  
Dans chaque groupe : mots-clés + **une annonce RSA** (responsive search ad).

Ne crée **pas** de groupes « Rénovation énergétique » ni « Rénovation complète ».

---

## 3. Noms, UTM, chemins d’affichage

URL finale (sans paramètre — le suffixe s’ajoute tout seul) :

```
https://nord-artisan-pro.com/
```

Suffixe d’URL (campagne **Recherche** uniquement, pas Display / PMax) :

```
utm_source=google&utm_medium=cpc&utm_campaign=loc-{ville-slug}&utm_content={metier-slug}&utm_term={keyword}
```

Exemple Bailleul / Peinture — URL finale `https://nord-artisan-pro.com/` + suffixe :

```
utm_source=google&utm_medium=cpc&utm_campaign=loc-bailleul&utm_content=peinture&utm_term={keyword}
```

Chemins d’affichage (sous l’URL verte, 15 car. max) — visibles dans Google, donc explicites :

- Chemin 1 : `{Ville}` tronqué si besoin (ex. `Bailleul`, `Saint-Pol`)
- Chemin 2 : `Formulaire`

Résultat sous l’URL : `nord-artisan-pro.com/Bailleul/Formulaire`

---

## 4. Mots-clés — règles communes

Types à utiliser (pas de large totale) :

- **Expression** (phrase) : `"peintre bailleul"`
- **Exacte** : `[peintre bailleul]`

Dans l’interface : colle le mot avec les guillemets ou les crochets, Google reconnaît le type.

Minuscules, sans accent obligatoire (Google normalise), mais tu peux coller avec accents.

---

## 5. Mots-clés négatifs (niveau campagne)

À coller une fois sur la campagne, pas dans chaque groupe. Type **expression** sauf mention contraire.

```
emploi
offre d'emploi
salaire
formation
stage
alternance
diy
tutoriel
youtube
gratuit
pas cher gratuit
lille
roubaix
tourcoing
lens
valenciennes
dunkerque
douai
arras
france
idf
paris
```

À retirer de cette liste si la ville pilote **est** l’une de ces communes (ex. ne pas négativer `lille` si tu cibles Lille).

Serrurerie : en plus, **au niveau du groupe Serrurerie uniquement** :

```
urgence
24h
24/24
nuit
ouverture de porte
perte de cles
perte de clés
```

(Le serrurier d’urgence n’est pas l’offre Nord Artisan Pro.)

---

## 6. Titres et descriptions partagés

À réutiliser dans **chaque** RSA, en plus des titres métier + ville.  
Max 15 titres et 4 descriptions par annonce.

**À épingler** — résultat visé : `Peintre sur Lille — Formulaire à remplir`

| Position | Titre | Pourquoi |
|---|---|---|
| 1 | `{Métier} sur {Ville}` (titre métier du groupe) | colle au mot-clé |
| 2 | `Formulaire à remplir` | le clic = un formulaire |
| 3 | `Artisans vérifiés` | pas n’importe quel pro |

Titres partagés (tous ≤ 30) :

```
Formulaire à remplir
Formulaire de travaux
Artisans vérifiés
Pros vérifiés RCS
Vérifiés RCS 59/62
Ils vous recontactent
Sans compte obligatoire
Gratuit pour vous
Nord Artisan Pro
```

Ne plus utiliser : `Publiez sans frais`, `Demande sans frais`, `Mise en relation`, `Trouvez un …`.

Descriptions partagées (toutes ≤ 90) — 2 à coller dans chaque RSA, plus 2 métier :

```
Remplissez un formulaire. Des pros vérifiés RCS vous recontactent. Gratuit, sans compte.
Un formulaire à remplir. Jusqu'à 5 artisans vérifiés du 59/62 vous joignent. Sans frais.
Vous remplissez un formulaire. Des professionnels vérifiés (RCS) vous contactent ensuite.
Ce n'est pas un annuaire. Remplissez le formulaire, des pros vérifiés vous contactent.
```

(4 descriptions max : prends les 2 premières partagées + les 2 descriptions métier du groupe.)

---

## 7. Les 14 groupes — mots-clés + RSA

Pour chaque groupe : copie les mots-clés en remplaçant `{Ville}`.  
RSA : titres métier (avec `{Ville}` ou le nom court §10) + titres partagés §6 (max 15 titres, 4 descriptions).  
Épingle `{Métier} sur {Ville}` en position 1, `Formulaire à remplir` en position 2, `Artisans vérifiés` en position 3.

### 7.1 Peinture

- Nom du groupe : `Peinture`
- `utm_content=peinture`

Mots-clés :

```
"peintre {Ville}"
[peintre {Ville}]
"peinture {Ville}"
[peinture {Ville}]
"devis peintre {Ville}"
[devis peintre {Ville}]
"artisan peintre {Ville}"
[artisan peintre {Ville}]
"peintre en batiment {Ville}"
[peintre en batiment {Ville}]
```

Titres métier :

```
Peintre sur {Ville}
Peinture sur {Ville}
Devis peintre {Ville}
Formulaire peintre
Artisan peintre local
Peintre vérifié 59/62
```

Descriptions métier :

```
Peinture intérieure ou façade : un formulaire, des pros vérifiés vous joignent. Gratuit.
Remplissez le formulaire peintre. Des pros vérifiés du 59/62 vous contactent. Gratuit.
```

### 7.2 Plomberie

- Nom du groupe : `Plomberie`
- `utm_content=plomberie`

```
"plombier {Ville}"
[plombier {Ville}]
"plomberie {Ville}"
[plomberie {Ville}]
"devis plombier {Ville}"
[devis plombier {Ville}]
"artisan plombier {Ville}"
[artisan plombier {Ville}]
```

Titres :

```
Plombier sur {Ville}
Plomberie sur {Ville}
Devis plombier {Ville}
Formulaire plombier
Artisan plombier local
Plombier vérifié 59/62
```

Descriptions :

```
Fuite, salle de bain, chauffage sanitaire : remplissez le formulaire. Pros vérifiés.
Remplissez le formulaire plombier. Des pros vérifiés du 59/62 vous contactent. Gratuit.
```

### 7.3 Électricité

- Nom du groupe : `Électricité`
- `utm_content=electricite`

```
"electricien {Ville}"
[electricien {Ville}]
"électricien {Ville}"
[électricien {Ville}]
"electricite {Ville}"
[electricite {Ville}]
"devis electricien {Ville}"
[devis electricien {Ville}]
"artisan electricien {Ville}"
[artisan electricien {Ville}]
```

Titres :

```
Électricien sur {Ville}
Électricité sur {Ville}
Devis électricien
Formulaire électricien
Artisan élec. local
Électricien vérifié
```

(`Artisan élec. local` = 19 car. — le mot « électricien » + ville dépasse souvent 30.)

Descriptions :

```
Mise aux normes, tableau, éclairage : un formulaire, des pros vérifiés vous joignent.
Remplissez le formulaire électricien. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.4 Maçonnerie

- Nom du groupe : `Maçonnerie`
- `utm_content=maconnerie`

```
"macon {Ville}"
[macon {Ville}]
"maçon {Ville}"
[maçon {Ville}]
"maconnerie {Ville}"
[maconnerie {Ville}]
"devis macon {Ville}"
[devis macon {Ville}]
"artisan macon {Ville}"
[artisan macon {Ville}]
```

Titres :

```
Maçon sur {Ville}
Maçonnerie sur {Ville}
Devis maçon {Ville}
Formulaire maçon
Artisan maçon local
Maçon vérifié 59/62
```

Descriptions :

```
Mur, dalle, extension : remplissez le formulaire. Artisans vérifiés RCS. Sans frais.
Remplissez le formulaire maçon. Des pros vérifiés du 59/62 vous contactent. Gratuit.
```

### 7.5 Isolation

- Nom du groupe : `Isolation`
- `utm_content=isolation`

```
"isolation {Ville}"
[isolation {Ville}]
"isolateur {Ville}"
[isolateur {Ville}]
"devis isolation {Ville}"
[devis isolation {Ville}]
"isolation combles {Ville}"
[isolation combles {Ville}]
"isolation exterieure {Ville}"
[isolation exterieure {Ville}]
```

Titres :

```
Isolation sur {Ville}
Isolant {Ville}
Devis isolation
Formulaire isolation
Artisan isolation
Isolation 59/62
```

Descriptions :

```
Isolation combles, murs ou extérieur : un formulaire, des artisans vérifiés vous joignent.
Remplissez le formulaire isolation. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.6 Chauffage / Pompe à chaleur

- Nom du groupe : `Chauffage`
- `utm_content=chauffage`

```
"chauffagiste {Ville}"
[chauffagiste {Ville}]
"chauffage {Ville}"
[chauffage {Ville}]
"pompe a chaleur {Ville}"
[pompe a chaleur {Ville}]
"devis chauffagiste {Ville}"
[devis chauffagiste {Ville}]
"installateur pac {Ville}"
[installateur pac {Ville}]
```

Titres :

```
Chauffagiste sur {Ville}
PAC sur {Ville}
Devis chauffage
Formulaire chauffage
Artisan chauffage
Chauffage 59/62
```

(`Chauffagiste sur {Ville}` dépasse 30 dès que la ville a plus de 13 lettres — d’où `Chauffagiste {Ville}` sans « sur ». Électricien : même logique, nom court §10.)

Descriptions :

```
Chaudière ou pompe à chaleur : remplissez le formulaire. Pros vérifiés 59/62. Gratuit.
Remplissez le formulaire chauffage. Des pros vérifiés vous contactent. Sans commission.
```

### 7.7 Menuiserie (fenêtres, portes, volets)

- Nom du groupe : `Menuiserie`
- `utm_content=menuiserie`

```
"menuisier {Ville}"
[menuisier {Ville}]
"menuiserie {Ville}"
[menuiserie {Ville}]
"fenetres {Ville}"
[fenetres {Ville}]
"devis menuisier {Ville}"
[devis menuisier {Ville}]
"volets {Ville}"
[volets {Ville}]
"portes fenetres {Ville}"
[portes fenetres {Ville}]
```

Titres :

```
Menuisier sur {Ville}
Fenêtres sur {Ville}
Devis menuiserie
Formulaire menuisier
Artisan menuisier
Menuiserie 59/62
```

Descriptions :

```
Fenêtres, portes, volets : remplissez le formulaire. Des artisans vérifiés vous joignent.
Remplissez le formulaire menuisier. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.8 Toiture / Couverture

- Nom du groupe : `Toiture`
- `utm_content=toiture`

```
"couvreur {Ville}"
[couvreur {Ville}]
"toiture {Ville}"
[toiture {Ville}]
"couverture {Ville}"
[couverture {Ville}]
"devis couvreur {Ville}"
[devis couvreur {Ville}]
"artisan couvreur {Ville}"
[artisan couvreur {Ville}]
"fuite toiture {Ville}"
[fuite toiture {Ville}]
```

Titres :

```
Couvreur sur {Ville}
Toiture sur {Ville}
Devis couvreur
Formulaire couvreur
Couvreur vérifié
Toiture 59/62
```

Descriptions :

```
Réparation ou réfection de toiture : un formulaire, des pros vérifiés vous joignent.
Remplissez le formulaire couvreur. Des pros vérifiés du 59/62 vous contactent. Gratuit.
```

### 7.9 Carrelage / Revêtements de sol

- Nom du groupe : `Carrelage`
- `utm_content=carrelage`

```
"carreleur {Ville}"
[carreleur {Ville}]
"carrelage {Ville}"
[carrelage {Ville}]
"devis carreleur {Ville}"
[devis carreleur {Ville}]
"revetement sol {Ville}"
[revetement sol {Ville}]
"artisan carreleur {Ville}"
[artisan carreleur {Ville}]
```

Titres :

```
Carreleur sur {Ville}
Carrelage sur {Ville}
Devis carreleur
Formulaire carreleur
Artisan carreleur
Carrelage 59/62
```

Descriptions :

```
Carrelage sol, mur ou SDB : remplissez le formulaire. Des pros vérifiés vous contactent.
Remplissez le formulaire carreleur. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.10 Placo / Cloisons

- Nom du groupe : `Placo`
- `utm_content=placo`

```
"plaquiste {Ville}"
[plaquiste {Ville}]
"placo {Ville}"
[placo {Ville}]
"cloisons {Ville}"
[cloisons {Ville}]
"devis plaquiste {Ville}"
[devis plaquiste {Ville}]
"platerie {Ville}"
[platerie {Ville}]
```

Titres :

```
Plaquiste sur {Ville}
Placo sur {Ville}
Devis plaquiste
Formulaire plaquiste
Artisan placo
Plaquiste 59/62
```

Descriptions :

```
Cloisons, placo, aménagement : remplissez le formulaire. Artisans vérifiés. Sans frais.
Remplissez le formulaire plaquiste. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.11 Extérieur / Aménagement paysager

- Nom du groupe : `Paysager`
- `utm_content=paysager`

```
"paysagiste {Ville}"
[paysagiste {Ville}]
"amenagement exterieur {Ville}"
[amenagement exterieur {Ville}]
"devis paysagiste {Ville}"
[devis paysagiste {Ville}]
"jardin {Ville} artisan"
[jardin {Ville} artisan]
"terrasse {Ville}"
[terrasse {Ville}]
```

Titres :

```
Paysagiste sur {Ville}
Extérieur sur {Ville}
Devis paysagiste
Formulaire paysagiste
Artisan extérieur
Paysagiste 59/62
```

Descriptions :

```
Paysagiste ou aménagement extérieur : un formulaire, des pros vérifiés vous joignent.
Remplissez le formulaire paysagiste. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.12 Terrassement

- Nom du groupe : `Terrassement`
- `utm_content=terrassement`

```
"terrassier {Ville}"
[terrassier {Ville}]
"terrassement {Ville}"
[terrassement {Ville}]
"devis terrassement {Ville}"
[devis terrassement {Ville}]
"entreprise terrassement {Ville}"
[entreprise terrassement {Ville}]
```

Titres :

```
Terrassier sur {Ville}
Terrassement sur {Ville}
Devis terrassement
Formulaire terrassier
VRD et terrassement
Terrassement 59/62
```

Descriptions :

```
Plateforme, accès, VRD : remplissez le formulaire. Entreprises vérifiées. Sans frais.
Remplissez le formulaire terrassement. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.13 Serrurerie

- Nom du groupe : `Serrurerie`
- `utm_content=serrurerie`

```
"serrurier {Ville}"
[serrurier {Ville}]
"serrurerie {Ville}"
[serrurerie {Ville}]
"devis serrurier {Ville}"
[devis serrurier {Ville}]
"pose serrure {Ville}"
[pose serrure {Ville}]
"porte blindee {Ville}"
[porte blindee {Ville}]
```

Titres :

```
Serrurier sur {Ville}
Serrurerie sur {Ville}
Devis serrurier
Formulaire serrurier
Artisan serrurier
Serrurier 59/62
```

Descriptions :

```
Pose, porte, serrure (hors urgence 24h) : un formulaire, des pros vérifiés. Gratuit.
Remplissez le formulaire serrurier. Des pros vérifiés du 59/62 vous contactent. Gratuit.
```

N’oublie pas les **négatifs du groupe** (urgence, 24h, etc.) listés en section 5.

### 7.14 Nettoyage / Multi-services

- Nom du groupe : `Nettoyage`
- `utm_content=nettoyage`

```
"nettoyage {Ville}"
[nettoyage {Ville}]
"multi services {Ville}"
[multi services {Ville}]
"entreprise nettoyage {Ville}"
[entreprise nettoyage {Ville}]
"nettoyage chantier {Ville}"
[nettoyage chantier {Ville}]
"homme toutes mains {Ville}"
[homme toutes mains {Ville}]
```

Titres :

```
Nettoyage sur {Ville}
Multi-services sur {Ville}
Devis nettoyage
Formulaire nettoyage
Artisan polyvalent
Nettoyage 59/62
```

Descriptions :

```
Nettoyage ou multi-services : remplissez le formulaire. Des pros vérifiés vous joignent.
Remplissez le formulaire nettoyage. Des pros vérifiés 59/62 vous contactent. Gratuit.
```

### 7.15 Optionnel — groupe générique « Travaux »

Seulement si tu veux aussi les recherches sans métier (`travaux {Ville}`, `devis travaux {Ville}`).

- Nom du groupe : `Travaux`
- URL : `/particulier/demande` (même formulaire type ; `utm_content=travaux` + `utm_term={keyword}` ouvre « Je ne sais pas »)
- `utm_content=travaux`
- Chemins : `{Ville}` / `Formulaire`

```
"travaux {Ville}"
[travaux {Ville}]
"devis travaux {Ville}"
[devis travaux {Ville}]
"artisan {Ville}"
[artisan {Ville}]
```

Titres :

```
Travaux sur {Ville}
Formulaire de travaux
Formulaire à remplir
Je ne sais pas le métier
Artisans vérifiés
Pros vérifiés 59/62
```

Épingle `{Métier} sur {Ville}` en position 1, `Formulaire à remplir` en position 2, `Artisans vérifiés` en position 3.

Descriptions :

```
Remplissez un formulaire. Métier inconnu ou plusieurs : des pros vérifiés vous joignent.
Vous décrivez les travaux. On oriente vers des pros vérifiés 59/62. Gratuit, sans compte.
```

### 7.16 Extensions (niveau campagne)

À ajouter une fois, elles s’affichent sous l’annonce dans Google :

Liens annexes (sitelinks) :

| Texte du lien | URL |
|---|---|
| Formulaire de travaux | `https://nord-artisan-pro.com/particulier/demande` |
| Comment ça marche | `https://nord-artisan-pro.com/comment-ca-marche` |
| Artisans vérifiés | `https://nord-artisan-pro.com/particulier` |

Accroches (callouts) :

```
Formulaire à remplir
Artisans vérifiés RCS
Gratuit pour vous
Sans compte obligatoire
Nord et Pas-de-Calais
Jusqu'à 5 artisans
```

---

## 8. Exemple rempli — Bailleul / Peinture

À coller tel quel pour vérifier que tout rentre.

- Campagne : `LOC - Bailleul - Recherche`
- Groupe : `Peinture`
- URL finale : `https://nord-artisan-pro.com/`
- Suffixe d’URL :

```
utm_source=google&utm_medium=cpc&utm_campaign=loc-bailleul&utm_content=peinture&utm_term={keyword}
```

- Chemins : `Bailleul` / `Formulaire`

Mots-clés :

```
"peintre Bailleul"
[peintre Bailleul]
"peinture Bailleul"
[peinture Bailleul]
"devis peintre Bailleul"
[devis peintre Bailleul]
"artisan peintre Bailleul"
[artisan peintre Bailleul]
"peintre en batiment Bailleul"
[peintre en batiment Bailleul]
```

Titres RSA (épingler n°1, n°2 et n°3) :

```
Peintre sur Bailleul              ← épinglé position 1
Peinture sur Bailleul
Devis peintre Bailleul
Formulaire peintre
Artisan peintre local
Peintre vérifié 59/62
Formulaire à remplir              ← épinglé position 2
Formulaire de travaux
Artisans vérifiés                 ← épinglé position 3
Pros vérifiés RCS
Vérifiés RCS 59/62
Ils vous recontactent
Sans compte obligatoire
Gratuit pour vous
Nord Artisan Pro
```

Descriptions RSA :

```
Remplissez un formulaire. Des pros vérifiés RCS vous recontactent. Gratuit, sans compte.
Un formulaire à remplir. Jusqu'à 5 artisans vérifiés du 59/62 vous joignent. Sans frais.
Peinture intérieure ou façade : un formulaire, des pros vérifiés vous joignent. Gratuit.
Remplissez le formulaire peintre. Des pros vérifiés du 59/62 vous contactent. Gratuit.
```

Aperçu visé dans Google (même structure pour chaque ville) :

> **Peintre sur Lille — Formulaire à remplir**  
> nord-artisan-pro.com/Lille/Formulaire

Pour Bailleul :

> **Peintre sur Bailleul — Formulaire à remplir**  
> nord-artisan-pro.com/Bailleul/Formulaire  
> Remplissez un formulaire. Des pros vérifiés RCS vous recontactent. Gratuit, sans compte.

---

## 9. Dupliquer pour une autre ville

1. Laisse tourner la campagne pilote **10 à 14 jours**.
2. Mets en **pause** les groupes à **0 impression**.
3. Dans Google Ads : campagne → **Dupliquer**.
4. Change uniquement :
   - nom `LOC - {NouvelleVille} - Recherche`
   - zones (nouvelle commune + rayon 12 km, option **Présence**)
   - `{Ville}` dans tous les mots-clés et titres
   - `utm_campaign=loc-{nouveau-slug}`
   - chemin d’affichage 1
5. Recalcule les titres à 30 caractères si le nom est long.
6. Budget : même 8–12 € / jour **par** ville (chaque campagne a son plafond).

Une nouvelle ville = **une copie de campagne**, pas 14 campagnes métier.

---

## 10. Villes pilotes suggérées

Communes 59/62 de quelques milliers d’habitants, assez centrales pour un rayon 12 km :

| Département | Villes |
|---|---|
| Nord (59) | Bergues, Wormhout, Estaires, Orchies, Cysoing, Merville |
| Pas-de-Calais (62) | Saint-Pol-sur-Ternoise, Aire-sur-la-Lys, Lillers, Desvres, Guînes |

À éviter pour ce test local : Lille, Roubaix, Tourcoing, Lens (autre logique, trop de volume).

Slugs UTM :

| Ville | `{ville-slug}` | Nom court (titres si > 30 car.) |
|---|---|---|
| Bergues | `bergues` | Bergues |
| Wormhout | `wormhout` | Wormhout |
| Estaires | `estaires` | Estaires |
| Orchies | `orchies` | Orchies |
| Cysoing | `cysoing` | Cysoing |
| Merville | `merville` | Merville |
| Saint-Pol-sur-Ternoise | `saint-pol-sur-ternoise` | Saint-Pol |
| Aire-sur-la-Lys | `aire-sur-la-lys` | Aire |
| Lillers | `lillers` | Lillers |
| Desvres | `desvres` | Desvres |
| Guînes | `guines` | Guînes |
| Bailleul | `bailleul` | Bailleul |

---

## 11. Après mise en ligne (rappel)

- Vérifie l’aperçu Google : l’annonce doit montrer **Peintre sur {Ville} — Formulaire à remplir**. Si le 2ᵉ bout manque, l’épinglage n’est pas enregistré.
- Semaine 1–2 : ne pas tout retoucher (apprentissage).
- Groupes à 0 impression → pause.
- Clics hors zone malgré le ciblage → rapport **Lieux** ; renforcer l’option **Présence**.
- Quand tu as des demandes régulières : passer les enchères vers **Maximiser les conversions** (événement formulaire).
