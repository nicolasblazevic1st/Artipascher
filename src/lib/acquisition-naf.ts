/**
 * Univers NAF pour la base d’acquisition artisans (SMS / admin),
 * plus large que les catégories UI plateforme.
 */

import { CONSTRUCTION_NAF_CODES } from "./artisans-types";
import { CATEGORY_NAF_CODES } from "./naf-codes";
import { getNafLabel, normalizeNafCode } from "./naf-trade-groups";

/** NAF adjacents hors section F déjà utilisés dans les catégories plateforme. */
export const ADJACENT_ACQUISITION_NAF = [
  "25.11Z",
  "81.21Z",
  "81.22Z",
  "81.29B",
  "81.30Z",
] as const;

/** Allowlist mémoire (complétée au runtime via extras fichier / admin). */
export const EXTRA_ACQUISITION_NAF_CODES: string[] = [];

const PLATFORM_CATEGORY_NAF = new Set(
  Object.values(CATEGORY_NAF_CODES)
    .flat()
    .map((c) => normalizeNafCode(c))
);

const ADJACENT_SET = new Set(
  ADJACENT_ACQUISITION_NAF.map((c) => normalizeNafCode(c))
);

function extraSet(extras: readonly string[] = EXTRA_ACQUISITION_NAF_CODES) {
  return new Set(extras.map((c) => normalizeNafCode(c)).filter(Boolean));
}

/** Section F construction : 41.*, 42.*, 43.* */
export function isSectionFNaf(nafCode: string): boolean {
  const n = normalizeNafCode(nafCode);
  return n.startsWith("41.") || n.startsWith("42.") || n.startsWith("43.");
}

export function isAcquisitionNaf(
  nafCode: string,
  extras: readonly string[] = EXTRA_ACQUISITION_NAF_CODES
): boolean {
  const n = normalizeNafCode(nafCode);
  if (!n) return false;
  if (isSectionFNaf(n)) return true;
  if (ADJACENT_SET.has(n)) return true;
  if (PLATFORM_CATEGORY_NAF.has(n)) return true;
  if (extraSet(extras).has(n)) return true;
  return false;
}

/** NAF déjà relié à une catégorie travaux Artipascher. */
export function isMappedToPlatformCategory(nafCode: string): boolean {
  return PLATFORM_CATEGORY_NAF.has(normalizeNafCode(nafCode));
}

/**
 * Codes exacts pour sync API paginée (liste F historique + catégories + adjacents + extras).
 * L’import stock utilise `isAcquisitionNaf` (préfixes 41/42/43).
 */
export function listAcquisitionNafCodesForApi(
  extras: readonly string[] = EXTRA_ACQUISITION_NAF_CODES
): string[] {
  const set = new Set<string>();
  for (const c of PLATFORM_CATEGORY_NAF) set.add(c);
  for (const c of ADJACENT_SET) set.add(c);
  for (const c of extraSet(extras)) set.add(c);
  for (const c of CONSTRUCTION_NAF_CODES) set.add(normalizeNafCode(c));
  return [...set].sort();
}

export function describeNaf(nafCode: string): {
  code: string;
  label: string;
  mapped: boolean;
  acquisition: boolean;
} {
  const code = normalizeNafCode(nafCode);
  return {
    code,
    label: getNafLabel(code),
    mapped: isMappedToPlatformCategory(code),
    acquisition: isAcquisitionNaf(code),
  };
}
