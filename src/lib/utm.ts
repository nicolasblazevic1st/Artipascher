/** `{keyword}`, `{campaignid}`, `{metier-slug}`… left unreplaced in the landing URL. */
const TRACKING_PLACEHOLDER = /\{[a-zA-Z0-9_.:-]+\}/;
const TRACKING_PLACEHOLDER_ALL = /\{[a-zA-Z0-9_.:-]+\}/g;

export function cleanTrackingParam(
  value: string | null | undefined
): string | undefined {
  if (typeof value !== "string") return undefined;
  let decoded = value.trim();
  if (!decoded) return undefined;
  try {
    decoded = decodeURIComponent(decoded.replace(/\+/g, " ")).trim();
  } catch {
    // keep trimmed raw value
  }
  if (!decoded) return undefined;

  if (!TRACKING_PLACEHOLDER.test(decoded)) {
    return decoded.slice(0, 120);
  }
  TRACKING_PLACEHOLDER_ALL.lastIndex = 0;
  const stripped = decoded
    .replace(TRACKING_PLACEHOLDER_ALL, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-_./]+|[-_./]+$/g, "")
    .trim();
  if (stripped.length < 2) return undefined;
  return stripped.slice(0, 120);
}

/** Group « Peintre Bailleul » and « peintre  bailleul » as the same keyword. */
export function keywordGroupKey(value: string): string | undefined {
  const cleaned = cleanTrackingParam(value);
  if (!cleaned) return undefined;
  const key = cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return key.length >= 2 ? key : undefined;
}
