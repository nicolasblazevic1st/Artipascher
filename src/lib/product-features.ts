/**
 * Produit contact-only (après v1.1) : mise en relation payante,
 * sans enchère inversée ni devis plateforme.
 * Le déblocage des coordonnées = service livré (pas d’anti-churn / recrédit).
 */
export const CONTACT_ONLY_MODE = true;

/** Anti-churn retiré : le contact débloqué est le service complet. */
export const ANTI_CHURN_RETIRED = true;

export const AUCTIONS_RETIRED_MESSAGE =
  "Les enchères inversées ne sont plus proposées. Artipascher se concentre sur la mise en relation (déblocage des coordonnées client).";

export const DEVIS_RETIRED_MESSAGE =
  "Les devis plateforme ne sont plus proposés. Après déblocage, échangez et devissez directement avec le client.";

export const INTEREST_RETIRED_MESSAGE =
  "La demande « Je suis intéressé » n’est plus nécessaire. Si vous correspondez aux attentes du client et qu’il reste des places, débloquez directement les coordonnées.";

export const ANTI_CHURN_RETIRED_MESSAGE =
  "Le recréditage « client injoignable » n’est plus proposé : le déblocage des coordonnées constitue le service livré.";

export function retiredFeatureJson(message: string) {
  return {
    error: message,
    retired: true as const,
    contactOnly: true as const,
  };
}
