import {
  addEnrichmentJob,
  bulkUpsertArtisans,
  markArtisansClosed,
} from "./artisans-db";
import { listAcquisitionNafCodesForApi } from "./acquisition-naf";
import { readAcquisitionNafExtras } from "./acquisition-naf-extras";
import {
  type ArtisanDepartment,
  type EnrichedArtisan,
} from "./artisans-types";
import { geocodeAddress } from "./geo";

const ENTREPRISES_API = "https://recherche-entreprises.api.gouv.fr";
const PER_PAGE = 25;
const DEFAULT_MAX_PAGES_PER_NAF = 4;
/** Plafond API pratique (25 × 400 = 10k résultats / NAF / dept). */
const FULL_MAX_PAGES_PER_NAF = 400;
const BATCH_FLUSH = 250;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface GouvEstablishment {
  siret?: string;
  etat_administratif?: string;
  libelle_commune?: string;
  departement?: string;
  code_postal?: string;
  adresse?: string;
  activite_principale?: string;
  latitude?: string;
  longitude?: string;
  date_creation?: string;
}

interface GouvCompany {
  siren: string;
  nom_complet?: string;
  etat_administratif?: string;
  date_creation?: string;
  activite_principale?: string;
  siege?: GouvEstablishment & { siret?: string };
  matching_etablissements?: GouvEstablishment[];
}

interface GouvSearchResponse {
  results?: GouvCompany[];
  total_results?: number;
}

function departmentFromPostal(code?: string): ArtisanDepartment | null {
  const postal = code?.replace(/\D/g, "") ?? "";
  if (postal.startsWith("59")) return "59";
  if (postal.startsWith("62")) return "62";
  return null;
}

function departmentFromEstablishment(
  est: GouvEstablishment
): ArtisanDepartment | null {
  if (est.departement === "59" || est.departement === "62") {
    return est.departement;
  }
  return departmentFromPostal(est.code_postal);
}

function buildAddress(est: GouvEstablishment): string {
  return (est.adresse ?? "").trim();
}

async function fetchNafPage(
  department: ArtisanDepartment,
  naf: string,
  page: number
): Promise<GouvCompany[]> {
  const url = new URL(`${ENTREPRISES_API}/search`);
  url.searchParams.set("departement", department);
  url.searchParams.set("activite_principale", naf);
  url.searchParams.set("etat_administratif", "A");
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(PER_PAGE));

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as GouvSearchResponse;
  return data.results ?? [];
}

function extractEstablishments(
  company: GouvCompany,
  department: ArtisanDepartment,
  naf: string
): Array<{
  siret: string;
  siren: string;
  companyName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  department: ArtisanDepartment;
  nafCode: string;
  companyCreatedAt?: string;
  lat?: number;
  lon?: number;
}> {
  const out: Array<{
    siret: string;
    siren: string;
    companyName: string;
    addressLine: string;
    postalCode: string;
    city: string;
    department: ArtisanDepartment;
    nafCode: string;
    companyCreatedAt?: string;
    lat?: number;
    lon?: number;
  }> = [];

  const candidates = [
    ...(company.matching_etablissements ?? []),
    ...(company.siege ? [company.siege] : []),
  ];

  const seen = new Set<string>();
  for (const est of candidates) {
    if (est.etat_administratif && est.etat_administratif !== "A") continue;
    const dep = departmentFromEstablishment(est);
    if (dep !== department) continue;
    if (!est.siret || seen.has(est.siret)) continue;
    seen.add(est.siret);

    const lat = est.latitude ? Number(est.latitude) : undefined;
    const lon = est.longitude ? Number(est.longitude) : undefined;

    out.push({
      siret: est.siret,
      siren: company.siren,
      companyName: company.nom_complet ?? "Entreprise",
      addressLine: buildAddress(est),
      postalCode: est.code_postal ?? "",
      city: est.libelle_commune ?? "",
      department: dep,
      nafCode: est.activite_principale ?? company.activite_principale ?? naf,
      companyCreatedAt: est.date_creation ?? company.date_creation,
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
    });
  }
  return out;
}

export interface SireneSyncOptions {
  departments?: ArtisanDepartment[];
  nafCodes?: readonly string[];
  maxPagesPerNaf?: number;
  /** Pagination jusqu’à épuisement (plafonnée à FULL_MAX_PAGES_PER_NAF). */
  full?: boolean;
  geocodeMissing?: boolean;
  /** Si true, marque closed les actifs du NAF+dept non revus dans cette sync complète. */
  markMissingClosed?: boolean;
}

export async function syncSireneWeekly(
  options: SireneSyncOptions = {}
): Promise<{
  upserted: number;
  geocoded: number;
  closed: number;
  errors: string[];
  pages: number;
}> {
  const departments = options.departments ?? (["59", "62"] as ArtisanDepartment[]);
  const extras = await readAcquisitionNafExtras();
  const nafCodes =
    options.nafCodes ?? listAcquisitionNafCodesForApi(extras);
  const maxPages = options.full
    ? FULL_MAX_PAGES_PER_NAF
    : options.maxPagesPerNaf ?? DEFAULT_MAX_PAGES_PER_NAF;
  const geocodeMissing = options.geocodeMissing !== false;
  const markMissingClosed = options.markMissingClosed === true;

  let upserted = 0;
  let geocoded = 0;
  let closed = 0;
  let pages = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();
  type Row = Omit<EnrichedArtisan, "createdAt" | "updatedAt">;
  let batch: Row[] = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    const chunk = batch;
    batch = [];
    const res = await bulkUpsertArtisans(chunk, { preserveContact: true });
    upserted += res.inserted + res.updated;
  }

  for (const department of departments) {
    for (const naf of nafCodes) {
      const seenThisSlice = new Set<string>();

      for (let page = 1; page <= maxPages; page++) {
        let companies: GouvCompany[] = [];
        try {
          companies = await fetchNafPage(department, naf, page);
          pages += 1;
          // ~7 req/s max côté API
          await sleep(160);
        } catch (e) {
          errors.push(
            `${department}/${naf}/p${page}: ${
              e instanceof Error ? e.message : "fetch error"
            }`
          );
          break;
        }

        if (companies.length === 0) break;

        for (const company of companies) {
          if (company.etat_administratif && company.etat_administratif !== "A") {
            continue;
          }
          const establishments = extractEstablishments(company, department, naf);
          for (const est of establishments) {
            seenThisSlice.add(est.siret);

            let lat = est.lat;
            let lon = est.lon;
            if (
              geocodeMissing &&
              (lat == null || lon == null) &&
              (est.addressLine || est.postalCode || est.city)
            ) {
              try {
                const geo = await geocodeAddress(
                  est.addressLine,
                  est.postalCode,
                  est.city
                );
                if (geo) {
                  lat = geo.lat;
                  lon = geo.lon;
                  geocoded += 1;
                }
              } catch {
                // ignore geocode errors
              }
            }

            batch.push({
              siret: est.siret,
              siren: est.siren,
              companyName: est.companyName,
              addressLine: est.addressLine,
              postalCode: est.postalCode,
              city: est.city,
              department: est.department,
              nafCode: est.nafCode,
              companyCreatedAt: est.companyCreatedAt,
              status: "active",
              lat,
              lon,
              enrichmentStatus: "pending",
              lastSeenAt: now,
              source: "gouv",
            });

            if (batch.length >= BATCH_FLUSH) {
              await flushBatch();
            }
          }
        }

        if (companies.length < PER_PAGE) break;
      }

      await flushBatch();

      if (markMissingClosed && seenThisSlice.size > 0) {
        const { listArtisans } = await import("./artisans-db");
        const existing = await listArtisans({
          department,
          status: "active",
        });
        const toClose = existing
          .filter(
            (a) =>
              a.nafCode === naf &&
              a.source === "gouv" &&
              !seenThisSlice.has(a.siret)
          )
          .map((a) => a.siret);
        closed += await markArtisansClosed(toClose, now);
      }
    }
  }

  await flushBatch();

  await addEnrichmentJob({
    kind: "sirene_weekly",
    ranAt: now,
    requestsSpent: 0,
    processed: upserted,
    skipped: 0,
    errors,
    note: `pages=${pages} geocoded=${geocoded} closed=${closed}`,
  });

  return { upserted, geocoded, closed, errors, pages };
}
