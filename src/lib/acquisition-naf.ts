/**
 * Univers NAF pour la base d’acquisition artisans (SMS / admin).
 * Strictement limité aux codes des 16 métiers plateforme (~22 NAF).
 */

import {
  CATEGORY_NAF_CODES,
  listPlatformCategoryNafCodes,
} from "./naf-codes";
import { getNafLabel, normalizeNafCode } from "./naf-trade-groups";

const PLATFORM_CATEGORY_NAF = new Set(listPlatformCategoryNafCodes());

/** @deprecated Conservé pour compat scripts ; l’acquisition n’utilise plus toute la section F. */
export function isSectionFNaf(nafCode: string): boolean {
  const n = normalizeNafCode(nafCode);
  return n.startsWith("41.") || n.startsWith("42.") || n.startsWith("43.");
}

/**
 * NAF autorisé en acquisition = uniquement les 22 codes des 16 métiers.
 * Les extras admin / section F large ne sont plus acceptés.
 */
export function isAcquisitionNaf(
  nafCode: string,
  _extras: readonly string[] = []
): boolean {
  return isMappedToPlatformCategory(nafCode);
}

/** NAF déjà relié à une catégorie travaux Artipascher. */
export function isMappedToPlatformCategory(nafCode: string): boolean {
  return PLATFORM_CATEGORY_NAF.has(normalizeNafCode(nafCode));
}

/** Codes exacts pour sync API SIRENE / import stock. */
export function listAcquisitionNafCodesForApi(
  _extras: readonly string[] = []
): string[] {
  return listPlatformCategoryNafCodes();
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

/** Exposé pour diagnostics / UI. */
export function platformCategoryNafCount(): number {
  return PLATFORM_CATEGORY_NAF.size;
}

export { CATEGORY_NAF_CODES, listPlatformCategoryNafCodes };
