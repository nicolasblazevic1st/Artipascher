/** Types + schéma logique pour l'enrichissement artisans (SIRENE + Places). */

export type ArtisanDepartment = "59" | "62";

export type ArtisanStatus = "active" | "closed";

export type EnrichmentStatus =
  | "pending"
  | "enriched"
  | "no_match"
  | "deferred"
  | "invalid_phone";

export type ArtisanSource = "gouv" | "platform" | "import";

export interface EnrichedArtisan {
  siret: string;
  siren: string;
  companyName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  department: ArtisanDepartment;
  /** Activité principale (APET) de l’établissement. */
  nafCode: string;
  /**
   * Autres NAF connus pour cet établissement (agrégés depuis le SIREN :
   * autres établissements actifs, APEN unité légale si différent).
   * SIRENE open data ne diffuse pas les activités secondaires déclarées sur un même SIRET.
   */
  nafSecondaryCodes?: string[];
  companyCreatedAt?: string;
  status: ArtisanStatus;
  closedAt?: string;
  lat?: number;
  lon?: number;
  phone?: string;
  website?: string;
  enrichmentStatus: EnrichmentStatus;
  enrichedAt?: string;
  lastVerifiedAt?: string;
  lastSeenAt?: string;
  lastSmsFailedAt?: string;
  source: ArtisanSource;
  optedOut?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaTracking {
  monthKey: string;
  monthlyLimit: number;
  requestsProduction: number;
  requestsEnrichment: number;
  /** Consommation production par jour (YYYY-MM-DD). */
  dailyProductionLog: Record<string, number>;
  /**
   * Bonus enrichissement exceptionnel par jour (YYYY-MM-DD → requêtes Places).
   * S’ajoute au budget nuit/jour calculé (base + report − prod).
   */
  dailyEnrichmentBonus?: Record<string, number>;
  enrichmentCarryover: number;
  enrichmentPaused: boolean;
  paidOverageEnabled: boolean;
  updatedAt: string;
}

export type EnrichmentJobKind =
  | "sirene_weekly"
  | "places_daily"
  | "places_production"
  | "geocode_backfill";

export interface EnrichmentJob {
  id: string;
  kind: EnrichmentJobKind;
  ranAt: string;
  requestsSpent: number;
  processed: number;
  skipped: number;
  errors: string[];
  note?: string;
}

export interface ArtisansEnrichmentDb {
  artisans: EnrichedArtisan[];
  quotaTracking: QuotaTracking[];
  jobs: EnrichmentJob[];
}

export const EMPTY_ARTISANS_DB: ArtisansEnrichmentDb = {
  artisans: [],
  quotaTracking: [],
  jobs: [],
};

export const STALE_ENRICHMENT_MS = 6 * 30 * 24 * 60 * 60 * 1000;

/** Codes NAF construction (section F, focus 41/42/43). */
export const CONSTRUCTION_NAF_CODES = [
  "41.10A",
  "41.10B",
  "41.10C",
  "41.10D",
  "41.20A",
  "41.20B",
  "42.11Z",
  "42.12Z",
  "42.13A",
  "42.13B",
  "42.21Z",
  "42.22Z",
  "42.91Z",
  "42.99Z",
  "43.11Z",
  "43.12A",
  "43.12B",
  "43.13Z",
  "43.21A",
  "43.21B",
  "43.22A",
  "43.22B",
  "43.29A",
  "43.29B",
  "43.31Z",
  "43.32A",
  "43.32B",
  "43.33Z",
  "43.34Z",
  "43.39Z",
  "43.91A",
  "43.91B",
  "43.99A",
  "43.99B",
  "43.99C",
  "43.99D",
  "43.99E",
] as const;
