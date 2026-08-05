/** Montants en centimes pour comparaisons exactes (évite les erreurs float). */

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

/** Parse une saisie UI / API en centimes (accepte "1234,56" ou 1234.56). */
export function parseAmountToCents(raw: unknown): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    const cents = Math.round(raw * 100);
    if (Math.abs(raw * 100 - cents) > 0.001) return null;
    return cents;
  }

  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/\u00a0/g, " ")
    .replace(/\s/g, "")
    .replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const euros = Number(normalized);
  if (!Number.isFinite(euros) || euros <= 0) return null;
  return Math.round(euros * 100);
}

export function amountsEqualToCentime(aEuros: number, bEuros: number): boolean {
  return eurosToCents(aEuros) === eurosToCents(bEuros);
}

/** Parse un montant français OCR (« 1 234,56 », « 1.234,56 », « 1234.5 »). */
export function parseFrenchMoneyToCents(raw: string): number | null {
  let s = raw.replace(/\u00a0/g, " ").trim();
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Style FR/EU : points = milliers, virgule = décimales
    s = s.replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(/\s/g, "").replace(",", ".");
  } else {
    s = s.replace(/\s/g, "");
    // Plusieurs points → séparateurs de milliers
    const parts = s.split(".");
    if (parts.length > 2) {
      const dec = parts.pop()!;
      s = parts.join("") + (dec.length <= 2 ? `.${dec}` : dec);
    }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const euros = Number(s);
  if (!Number.isFinite(euros) || euros <= 0) return null;
  return Math.round(euros * 100);
}
