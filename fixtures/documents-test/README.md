# Documents de test vérifiables (sources publiques)

Kit pour tester Nord Artisan Pro avec des **documents issus d’internet / sources officielles**, plus des specimens d’assurance alignés sur une **vraie entreprise 59**.

## Entreprise de référence (registre public)

- **RAMERY TRAVAUX PUBLICS**
- **SIRET :** `61712011800170`
- **SIREN :** `617120118`
- **Siège :** Erquinghem-Lys (59)

## Fichiers à utiliser

| Fichier | Nature | Source |
|--------|--------|--------|
| `kbis-ou-avis-sirene.pdf` | Avis de situation SIRENE | **INSEE officiel** (gratuit) |
| `02-modele-decennale-service-public.pdf` | Modèle d’attestation décennale | **Service-Public** (R44868) |
| `rc-pro.pdf` | Attestation RC (texte + regex) | Specimen Nord Artisan Pro (SIRET réel) |
| `decennale.pdf` | Attestation décennale (texte + regex) | Specimen Nord Artisan Pro (SIRET réel) |
| `fiche-entreprise-verifiable.json` | Identité + dirigeants + noms CB | Registre gouv + INSEE |

> Les fichiers `rc-pro.pdf` / `decennale.pdf` **ne sont pas** de vraies polices d’assurance : ce sont des specimens PDF texte pour tests (extraction + regex), remplis avec les infos **publiques** de l’entreprise.  
> L’avis SIRENE et le modèle Service-Public sont des documents **officiels**.  
> Pas d’OCR image : seuls les PDF texte sont analysés.

## Carte Stripe test

- `4242 4242 4242 4242`
- Nom **match** : voir `suggestedBillingNameMatch` dans le JSON (dirigeant registre)
- Nom **mismatch** : `Camille Testeur Inconnu`

## Régénérer / re-télécharger

```bash
node scripts/fetch-verifiable-test-docs.mjs
npx tsx scripts/verify-verifiable-docs.mts
```

## Upload inscription staging

1. SIRET : `61712011800170` (doit passer registre + zone 59)
2. Documents : `rc-pro.pdf` + `decennale.pdf` (pas de Kbis — registre + BODACC suffisent)
3. Après paiement test : contrôler le badge nom CB en admin
