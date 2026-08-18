import type {
  LegalRepresentative,
  PaymentNameCheck,
  PaymentNameCheckStatus,
} from "@/lib/store-types";

/** Normalise un nom pour comparaison souple (casse, accents, ponctuation). */
export function normalizePersonName(value: string | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalizePersonName(value)
    .split(" ")
    .filter((t) => t.length >= 2);
}

/** Vrai si les deux chaînes se recouvrent suffisamment (inclusion ou tokens partagés). */
export function softNamesMatch(
  a: string | undefined,
  b: string | undefined
): boolean {
  const na = normalizePersonName(a);
  const nb = normalizePersonName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const ta = tokens(a!);
  const tb = tokens(b!);
  if (ta.length === 0 || tb.length === 0) return false;

  const setB = new Set(tb);
  const shared = ta.filter((t) => setB.has(t));
  // Au moins 2 tokens en commun, ou 1 si l'un des deux n'a qu'un seul token significatif
  if (shared.length >= 2) return true;
  if (shared.length === 1 && (ta.length === 1 || tb.length === 1)) return true;
  return false;
}

export function evaluatePaymentNameCheck(params: {
  cardName: string | undefined;
  companyName: string | undefined;
  legalRepresentatives?: LegalRepresentative[];
}): PaymentNameCheck {
  const checkedAt = new Date().toISOString();
  const cardName = params.cardName?.trim() || undefined;

  if (!cardName) {
    return {
      status: "unavailable",
      cardName: undefined,
      matchedAgainst: undefined,
      checkedAt,
    };
  }

  const reps = params.legalRepresentatives ?? [];
  for (const rep of reps) {
    if (softNamesMatch(cardName, rep.fullName)) {
      return {
        status: "match",
        cardName,
        matchedAgainst: `dirigeant:${rep.fullName}`,
        checkedAt,
      };
    }
  }

  if (softNamesMatch(cardName, params.companyName)) {
    return {
      status: "match",
      cardName,
      matchedAgainst: `entreprise:${params.companyName}`,
      checkedAt,
    };
  }

  const status: PaymentNameCheckStatus =
    reps.length === 0 && !params.companyName ? "unavailable" : "mismatch";

  return {
    status,
    cardName,
    matchedAgainst: undefined,
    checkedAt,
  };
}
