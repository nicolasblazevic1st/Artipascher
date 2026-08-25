/** Seuil client / campagnes : « jeune » (< 2 ans) vs « établi » (≥ 2 ans). */
export const COMPANY_AGE_THRESHOLD_YEARS = 2;
export const COMPANY_AGE_YOUNG_SHORT = `0–${COMPANY_AGE_THRESHOLD_YEARS} ans`;
export const COMPANY_AGE_ESTABLISHED_SHORT = `${COMPANY_AGE_THRESHOLD_YEARS}+`;
export const COMPANY_AGE_THRESHOLD_MS =
  COMPANY_AGE_THRESHOLD_YEARS * 365.25 * 24 * 60 * 60 * 1000;

export type CompanyAgeCohort = "young" | "established";
