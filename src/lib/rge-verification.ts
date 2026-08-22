/**
 * Contrôle RGE (Reconnu Garant de l'Environnement) — open data ADEME.
 * Licence Ouverte / Etalab 2.0
 * https://data.ademe.fr/datasets/liste-des-entreprises-rge-2
 *
 * Jeu virtuel « liste-des-entreprises-rge-2 » = qualifications en cours
 * (traitement_termine = false), actualisé quotidiennement.
 * Pas d’API Entreprise (réservée aux administrations).
 */

import { normalizeFrenchPhone } from "./phone-format";
import type { RgeQualification, RgeVerificationSnapshot } from "./store-types";

const ADEME_DATASET_SLUG = "liste-des-entreprises-rge-2";
const ADEME_LINES_URL = `https://data.ademe.fr/data-fair/api/v1/datasets/${ADEME_DATASET_SLUG}/lines`;
const ADEME_PUBLIC_URL = `https://data.ademe.fr/datasets/${ADEME_DATASET_SLUG}`;

const SELECT_FIELDS = [
  "siret",
  "nom_entreprise",
  "adresse",
  "code_postal",
  "commune",
  "latitude",
  "longitude",
  "telephone",
  "site_internet",
  "domaine",
  "meta_domaine",
  "nom_qualification",
  "nom_certificat",
  "organisme",
  "lien_date_debut",
  "lien_date_fin",
  "url_qualification",
].join(",");

export const RGE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

/** Catégories de travaux où le label RGE ouvre les aides (MaPrimeRénov’, CEE…). */
export const RGE_RELEVANT_WORK_CATEGORIES = [
  "Isolation",
  "Chauffage / Pompe à chaleur",
  "Rénovation énergétique",
  "Menuiserie (fenêtres, portes, volets)",
  "Toiture / Couverture",
  "Électricité",
] as const;

export function workMayBenefitFromRge(category?: string): boolean {
  if (!category) return false;
  return (RGE_RELEVANT_WORK_CATEGORIES as readonly string[]).includes(category);
}

export function normalizeRgeSiret(input: string): string {
  return input.replace(/\D/g, "").slice(0, 14);
}

/** Fiche ADEME publique pour un SIRET. */
export function rgePublicSearchUrl(siretInput: string): string {
  const siret = normalizeRgeSiret(siretInput);
  const url = new URL(ADEME_PUBLIC_URL);
  if (siret) url.searchParams.set("q", siret);
  return url.toString();
}

export function isRgeSnapshotFresh(
  snapshot: Pick<RgeVerificationSnapshot, "checkedAt"> | undefined,
  now = Date.now()
): boolean {
  if (!snapshot?.checkedAt) return false;
  const t = new Date(snapshot.checkedAt).getTime();
  if (Number.isNaN(t)) return false;
  return now - t < RGE_CACHE_MS;
}

export function isRgeCurrentlyValid(
  snapshot: RgeVerificationSnapshot | undefined
): boolean {
  if (!snapshot || !snapshot.isRge || snapshot.status !== "verified") {
    return false;
  }
  if (!snapshot.validUntil) return true;
  return snapshot.validUntil >= todayIsoDate();
}

/** Snapshot allégé stocké sur la base artisans. */
export function artisanIsRge(
  artisan:
    | {
        rge?: {
          isRge?: boolean;
          status?: string;
          validUntil?: string;
        };
      }
    | null
    | undefined
): boolean {
  const rge = artisan?.rge;
  if (!rge?.isRge || rge.status !== "verified") return false;
  if (!rge.validUntil) return true;
  return rge.validUntil >= todayIsoDate();
}

function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

interface AdemeRgeLine {
  siret?: string;
  nom_entreprise?: string;
  adresse?: string;
  code_postal?: string;
  commune?: string;
  latitude?: number;
  longitude?: number;
  telephone?: string;
  site_internet?: string;
  domaine?: string;
  meta_domaine?: string;
  nom_qualification?: string;
  nom_certificat?: string;
  organisme?: string;
  lien_date_debut?: string;
  lien_date_fin?: string;
  url_qualification?: string;
}

/** Fiche ADEME regroupée par SIRET (qualifications + coordonnées). */
export interface AdemeRgeProfile {
  snapshot: RgeVerificationSnapshot;
  companyName?: string;
  addressLine?: string;
  postalCode?: string;
  city?: string;
  lat?: number;
  lon?: number;
  phone?: string;
  website?: string;
}

interface AdemeLinesResponse {
  total?: number;
  next?: string;
  results?: AdemeRgeLine[];
}

function isOpenEndedDate(value?: string): boolean {
  if (!value) return true;
  return value.startsWith("2099");
}

function qualificationStillValid(line: AdemeRgeLine, today: string): boolean {
  const end = line.lien_date_fin;
  if (!end || isOpenEndedDate(end)) return true;
  return end >= today;
}

function toQualification(line: AdemeRgeLine): RgeQualification {
  return {
    domain: line.domaine?.trim() || "Non renseigné",
    metaDomain: line.meta_domaine?.trim() || undefined,
    qualificationName: line.nom_qualification?.trim() || undefined,
    certificateName: line.nom_certificat?.trim() || undefined,
    organism: line.organisme?.trim() || undefined,
    validFrom: line.lien_date_debut || undefined,
    validUntil: isOpenEndedDate(line.lien_date_fin)
      ? undefined
      : line.lien_date_fin || undefined,
    qualificationUrl: line.url_qualification?.trim() || undefined,
  };
}

export function summarizeRgeFromLines(
  siret: string,
  lines: AdemeRgeLine[],
  checkedAt = new Date().toISOString()
): RgeVerificationSnapshot {
  const today = todayIsoDate();
  const active = lines.filter((line) => qualificationStillValid(line, today));
  const qualifications = active.map(toQualification);
  const domains = [
    ...new Set(qualifications.map((q) => q.domain).filter(Boolean)),
  ];
  const validUntilDates = qualifications
    .map((q) => q.validUntil)
    .filter((d): d is string => Boolean(d))
    .sort();

  if (active.length > 0) {
    return {
      status: "verified",
      checkedAt,
      siret,
      isRge: true,
      companyName: active[0]?.nom_entreprise?.trim() || undefined,
      domains,
      qualifications,
      validUntil: validUntilDates[0],
    };
  }

  if (lines.length > 0) {
    return {
      status: "expired",
      checkedAt,
      siret,
      isRge: false,
      companyName: lines[0]?.nom_entreprise?.trim() || undefined,
      domains: [
        ...new Set(
          lines
            .map((l) => l.domaine?.trim())
            .filter((d): d is string => Boolean(d))
        ),
      ],
    };
  }

  return {
    status: "not_rge",
    checkedAt,
    siret,
    isRge: false,
  };
}

function firstFilled(lines: AdemeRgeLine[], key: keyof AdemeRgeLine): string | undefined {
  for (const line of lines) {
    const value = line[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function firstNumber(lines: AdemeRgeLine[], key: "latitude" | "longitude"): number | undefined {
  for (const line of lines) {
    const value = line[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function profileFromAdemeLines(
  siret: string,
  lines: AdemeRgeLine[],
  checkedAt = new Date().toISOString()
): AdemeRgeProfile {
  const snapshot = summarizeRgeFromLines(siret, lines, checkedAt);
  const rawPhone = firstFilled(lines, "telephone");
  return {
    snapshot,
    companyName: snapshot.companyName ?? firstFilled(lines, "nom_entreprise"),
    addressLine: firstFilled(lines, "adresse"),
    postalCode: firstFilled(lines, "code_postal"),
    city: firstFilled(lines, "commune"),
    lat: firstNumber(lines, "latitude"),
    lon: firstNumber(lines, "longitude"),
    phone: rawPhone ? normalizeFrenchPhone(rawPhone) ?? undefined : undefined,
    website: firstFilled(lines, "site_internet"),
  };
}

async function fetchAdemeLines(url: URL | string): Promise<AdemeLinesResponse> {
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    throw new Error(`ADEME RGE HTTP ${response.status}`);
  }
  return (await response.json()) as AdemeLinesResponse;
}

function siretQueryUrl(siret: string): URL {
  const url = new URL(ADEME_LINES_URL);
  url.searchParams.set("qs", `siret:"${siret}"`);
  url.searchParams.set("size", "100");
  url.searchParams.set("select", SELECT_FIELDS);
  return url;
}

/** Interroge l’annuaire ADEME pour un SIRET (établissement). */
export async function checkRgeBySiret(
  siretInput: string
): Promise<RgeVerificationSnapshot> {
  const siret = normalizeRgeSiret(siretInput);
  const checkedAt = new Date().toISOString();

  if (!/^\d{14}$/.test(siret)) {
    return {
      status: "unavailable",
      checkedAt,
      siret: siretInput,
      isRge: false,
      error: "SIRET invalide pour contrôle RGE.",
    };
  }

  try {
    const data = await fetchAdemeLines(siretQueryUrl(siret));
    const results = (data.results ?? []).filter(
      (row) => normalizeRgeSiret(row.siret ?? "") === siret
    );
    return summarizeRgeFromLines(siret, results, checkedAt);
  } catch (err) {
    return {
      status: "unavailable",
      checkedAt,
      siret,
      isRge: false,
      error: err instanceof Error ? err.message : "Erreur API ADEME RGE",
    };
  }
}

/**
 * Recense les établissements RGE des départements 59 / 62 (codes postaux).
 * Pagination Data Fair via le curseur `next`.
 */
export async function fetchRgeDirectoryForPostalPrefixes(
  prefixes: readonly string[],
  options?: { pageSize?: number; maxPages?: number }
): Promise<{
  bySiret: Map<string, AdemeRgeProfile>;
  lineCount: number;
  pages: number;
  errors: string[];
}> {
  const pageSize = Math.min(10000, Math.max(100, options?.pageSize ?? 1000));
  const maxPages = Math.max(1, options?.maxPages ?? 40);
  const bySiret = new Map<string, AdemeRgeLine[]>();
  const errors: string[] = [];
  let lineCount = 0;
  let pages = 0;
  const checkedAt = new Date().toISOString();

  for (const prefix of prefixes) {
    const qs = `code_postal:${prefix}*`;
    let nextUrl: string | undefined;
    const first = new URL(ADEME_LINES_URL);
    first.searchParams.set("qs", qs);
    first.searchParams.set("size", String(pageSize));
    first.searchParams.set("select", SELECT_FIELDS);

    let url: string = first.toString();
    for (let page = 0; page < maxPages; page++) {
      try {
        const data = await fetchAdemeLines(url);
        pages += 1;
        const results = data.results ?? [];
        lineCount += results.length;
        for (const row of results) {
          const siret = normalizeRgeSiret(row.siret ?? "");
          if (!/^\d{14}$/.test(siret)) continue;
          const list = bySiret.get(siret) ?? [];
          list.push(row);
          bySiret.set(siret, list);
        }
        nextUrl = data.next;
        if (!nextUrl || results.length === 0) break;
        url = nextUrl;
      } catch (err) {
        errors.push(
          `${prefix} page ${page + 1}: ${
            err instanceof Error ? err.message : "erreur ADEME"
          }`
        );
        break;
      }
    }
  }

  const profiles = new Map<string, AdemeRgeProfile>();
  for (const [siret, lines] of bySiret) {
    profiles.set(siret, profileFromAdemeLines(siret, lines, checkedAt));
  }

  return { bySiret: profiles, lineCount, pages, errors };
}
