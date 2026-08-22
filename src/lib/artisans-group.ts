import type { EnrichedArtisan } from "./artisans-types";
import { isMappedToPlatformCategory } from "./acquisition-naf";
import {
  normalizeNafCode,
} from "./naf-trade-groups";
import { artisanIsRge } from "./rge-verification";

export interface ArtisanEstablishmentSummary {
  siret: string;
  city: string;
  department: "59" | "62";
  postalCode: string;
  nafCode: string;
}

export interface ArtisanCompanyRow {
  siren: string;
  companyName: string;
  department: "59" | "62";
  cities: string[];
  sirets: string[];
  establishments: ArtisanEstablishmentSummary[];
  /** Tous les NAF distincts (tous établissements confondus). */
  nafCodes: string[];
  mappedToCategory: boolean;
  hasUnmappedPrimary: boolean;
  phone?: string;
  website?: string;
  enrichmentStatus: EnrichedArtisan["enrichmentStatus"];
  optedOut?: boolean;
  source: EnrichedArtisan["source"];
  isRge: boolean;
  googleRating?: number;
}

const ENRICHMENT_RANK: Record<EnrichedArtisan["enrichmentStatus"], number> = {
  enriched: 5,
  invalid_phone: 4,
  no_match: 3,
  deferred: 2,
  pending: 1,
};

function pickEnrichmentStatus(
  statuses: EnrichedArtisan["enrichmentStatus"][]
): EnrichedArtisan["enrichmentStatus"] {
  return statuses.reduce((best, cur) =>
    ENRICHMENT_RANK[cur] > ENRICHMENT_RANK[best] ? cur : best
  );
}

export function groupArtisansBySiren(
  artisans: EnrichedArtisan[]
): ArtisanCompanyRow[] {
  const bySiren = new Map<string, EnrichedArtisan[]>();
  for (const a of artisans) {
    if (!bySiren.has(a.siren)) bySiren.set(a.siren, []);
    bySiren.get(a.siren)!.push(a);
  }

  const groups: ArtisanCompanyRow[] = [];

  for (const [siren, list] of bySiren) {
    list.sort((a, b) => a.siret.localeCompare(b.siret));

    const nafSet = new Set<string>();
    for (const a of list) {
      nafSet.add(normalizeNafCode(a.nafCode));
    }

    const nafCodes = [...nafSet].sort((a, b) => a.localeCompare(b));
    const establishments = list.map((a) => ({
      siret: a.siret,
      city: a.city,
      department: a.department,
      postalCode: a.postalCode,
      nafCode: normalizeNafCode(a.nafCode),
    }));

    const cities = [...new Set(list.map((a) => a.city).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "fr")
    );

    const withPhone = list.find((a) => a.phone?.trim());
    const withWebsite = list.find((a) => a.website?.trim());
    const primary =
      list.find((a) => isMappedToPlatformCategory(a.nafCode)) ?? list[0];

    groups.push({
      siren,
      companyName: primary.companyName,
      department: primary.department,
      cities,
      sirets: list.map((a) => a.siret),
      establishments,
      nafCodes,
      mappedToCategory: nafCodes.some((n) => isMappedToPlatformCategory(n)),
      hasUnmappedPrimary: list.some(
        (a) => !isMappedToPlatformCategory(a.nafCode)
      ),
      phone: withPhone?.phone?.trim() || undefined,
      website: withWebsite?.website?.trim() || undefined,
      enrichmentStatus: pickEnrichmentStatus(
        list.map((a) => a.enrichmentStatus)
      ),
      optedOut: list.some((a) => a.optedOut),
      source: primary.source,
      isRge: list.some((a) => artisanIsRge(a)),
      googleRating: list
        .map((a) => a.googleRating)
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
        .sort((a, b) => b - a)[0],
    });
  }

  groups.sort((a, b) => a.companyName.localeCompare(b.companyName, "fr"));
  return groups;
}

export function companyMatchesQuery(row: ArtisanCompanyRow, q: string): boolean {
  const hay = [
    row.companyName,
    row.siren,
    ...row.sirets,
    ...row.cities,
    ...row.nafCodes,
    row.phone ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function companyMatchesNafFilter(
  row: ArtisanCompanyRow,
  nafFilter: readonly string[]
): boolean {
  if (nafFilter.length === 0) return true;
  const set = new Set(nafFilter.map(normalizeNafCode));
  return row.nafCodes.some((code) => set.has(code));
}
