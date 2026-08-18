import { randomBytes } from "crypto";

/** Programme de parrainage désactivé (trop de risques / litiges). */
export const REFERRAL_ENABLED = false;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Normalise un code saisi (casse, espaces, tirets). */
export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Génère un code court unique du type APXXXXXXXX. */
export function generateReferralCode(): string {
  const bytes = randomBytes(6);
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return `AP${body}`;
}

export function buildReferralPath(code: string): string {
  return `/professionnel?ref=${encodeURIComponent(normalizeReferralCode(code))}`;
}

export function buildReferralUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildReferralPath(code)}`;
}

export function isValidReferralCodeFormat(code: string): boolean {
  const normalized = normalizeReferralCode(code);
  return /^AP[A-Z0-9]{6}$/.test(normalized);
}
