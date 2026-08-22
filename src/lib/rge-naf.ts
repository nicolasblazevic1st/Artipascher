/**
 * Correspondance domaines ADEME RGE → codes NAF plateforme.
 * Sert à intégrer les entreprises RGE absentes de SIRENE dans la base acquisition.
 */

import { getNafCodesForCategory } from "./naf-codes";
import { normalizeNafCode } from "./naf-trade-groups";

const DOMAIN_TO_CATEGORY: Array<{ test: RegExp; category: string }> = [
  { test: /isolation/i, category: "Isolation" },
  {
    test: /fen[êe]tre|volet|porte donnant/i,
    category: "Menuiserie (fenêtres, portes, volets)",
  },
  {
    test: /pompe à chaleur|chauffe-eau|chaudi[èe]re|po[êe]le|insert|chauffage|ventilation|solaire thermique/i,
    category: "Chauffage / Pompe à chaleur",
  },
  {
    test: /photovolta[ïi]que|radiateur[s]? électrique/i,
    category: "Électricité",
  },
  {
    test: /toiture(?!.*isolation)|couverture/i,
    category: "Toiture / Couverture",
  },
  {
    test: /r[ée]novation|projet complet/i,
    category: "Rénovation énergétique",
  },
];

/** Codes NAF plateforme dérivés des domaines de travaux ADEME. */
export function nafCodesFromRgeDomains(
  domains: readonly string[] | undefined
): string[] {
  const codes = new Set<string>();
  for (const domain of domains ?? []) {
    for (const rule of DOMAIN_TO_CATEGORY) {
      if (!rule.test.test(domain)) continue;
      for (const code of getNafCodesForCategory(rule.category)) {
        const normalized = normalizeNafCode(code);
        if (normalized) codes.add(normalized);
      }
    }
  }
  return [...codes];
}
