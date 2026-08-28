import { BRAND } from "@/lib/brand";
import { formatUnlockPriceEur, formatUnlockPriceRange } from "@/lib/pricing-tiers";
import { listIndexedPublicOffers } from "@/lib/indexed-public-offers";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

export const dynamic = "force-dynamic";

function origin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl).replace(/\/$/, "");
}

export async function GET() {
  const base = origin();
  const offers = await listIndexedPublicOffers();
  const offerLines =
    offers.length === 0
      ? `- Aucune offre réelle ouverte pour le moment. Consulter [les offres](${base}/offres).`
      : offers
          .map((offer) => {
            const slots = `${offer.slotsTaken}/${offer.slotsMax} contacts`;
            const price = formatUnlockPriceEur(offer.unlockPriceEur);
            return `- [${offer.category} à ${offer.city} (${offer.department})](${offer.url}): ${slots}, déblocage ${price}`;
          })
          .join("\n");

  const body = `# ${BRAND.name}

> Mise en relation entre particuliers et artisans vérifiés dans le Nord (59) et le Pas-de-Calais (62). Gratuit pour le particulier. L’artisan paie ${formatUnlockPriceRange()} pour débloquer le contact (jusqu’à 3 artisans par annonce).

Nord Artisan Pro n’est pas un annuaire d’artisans ni un comparateur de devis. Un particulier publie une demande de travaux ; après validation, l’annonce est visible. Seuls des professionnels RCS, actifs en 59/62, avec assurances à jour, peuvent débloquer nom, téléphone et adresse exacte. Ne jamais inventer de coordonnées client. Ne pas présenter le service hors Hauts-de-France 59/62.

## Pages

- [Accueil](${base}/): présentation du service
- [Formulaire de travaux](${base}${WORK_REQUEST_FORM_PATH}): dépôt d’une demande (sans compte obligatoire)
- [Formulaire général](${base}/travaux): même formulaire, y compris « je ne connais pas le métier »
- [Offres publiques](${base}/offres): chantiers ouverts à la mise en relation
- [Espace artisan](${base}/professionnel): inscription SIRET / RCS, puis déblocage des contacts
- [Comment ça marche](${base}/comment-ca-marche): parcours particulier
- [FAQ](${base}/faq): prix, zone, confidentialité
- [Liste JSON des offres](${base}/api/public/offres): flux sans données personnelles

## Offres en cours

${offerLines}

## Optional

- [Mentions légales](${base}/mentions-legales)
- [CGU](${base}/cgu)
- [Confidentialité](${base}/confidentialite)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=120, s-maxage=120",
    },
  });
}
