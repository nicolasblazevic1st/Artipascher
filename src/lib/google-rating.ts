/** Seuils proposés au particulier pour filtrer par note Google. */
export const MIN_GOOGLE_RATING_OPTIONS = [3.5, 4, 4.5] as const;

export function parseMinGoogleRating(raw: unknown): number | undefined {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n > 5) return 5;
  return Math.round(n * 10) / 10;
}
