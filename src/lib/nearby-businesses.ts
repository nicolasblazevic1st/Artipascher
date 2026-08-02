import { geocodeCity } from "./geo";
import { getNafCodesForCategory } from "./naf-codes";
import { readStore } from "./store";
import type { ProRegistration } from "./store-types";

const ENTREPRISES_API = "https://recherche-entreprises.api.gouv.fr";
const DEFAULT_RADIUS_KM = 25;
const MAX_PAGES = 3;
const PER_PAGE = 25;

export interface NearbyBusiness {
  siret: string;
  siren: string;
  name: string;
  city: string;
  department: "59" | "62";
  nafCode: string;
  source: "gouv" | "platform";
  /** Disponible uniquement pour les artisans inscrits sur Artipascher. */
  phone?: string;
  email?: string;
  proId?: string;
}

interface GouvEstablishment {
  siret?: string;
  etat_administratif?: string;
  libelle_commune?: string;
  departement?: string;
  activite_principale?: string;
  latitude?: string;
  longitude?: string;
}

interface GouvCompany {
  siren: string;
  nom_complet?: string;
  etat_administratif?: string;
  matching_etablissements?: GouvEstablishment[];
}

interface GouvNearPointResponse {
  results?: GouvCompany[];
}

function normalizeCategoryForPro(category: string, proCategory: string): boolean {
  const c = category.toLowerCase();
  const p = proCategory.toLowerCase();
  if (c.includes(p) || p.includes(c.slice(0, 4))) return true;
  const map: Record<string, string[]> = {
    peinture: ["peinture"],
    plomberie: ["plomberie"],
    électricité: ["electricite", "électricité"],
    electricite: ["électricité", "electricite"],
    maconnerie: ["maçonnerie", "maconnerie"],
    isolation: ["isolation"],
    chauffage: ["chauffage"],
  };
  for (const [key, aliases] of Object.entries(map)) {
    if (c.includes(key) && aliases.some((a) => p.includes(a.replace("é", "e")))) return true;
  }
  return false;
}

function platformProsToNearby(pros: ProRegistration[], category: string): NearbyBusiness[] {
  return pros
    .filter((p) => p.status === "approved" && normalizeCategoryForPro(category, p.category))
    .map((p) => ({
      siret: p.siret,
      siren: p.siren,
      name: p.companyName,
      city: p.city,
      department: p.department,
      nafCode: p.category,
      source: "platform" as const,
      phone: p.phone,
      email: p.email,
      proId: p.id,
    }));
}

async function fetchGouvNearby(params: {
  lat: number;
  lon: number;
  radiusKm: number;
  nafCodes: string[];
  department: "59" | "62";
}): Promise<NearbyBusiness[]> {
  const { lat, lon, radiusKm, nafCodes, department } = params;
  const seen = new Set<string>();
  const results: NearbyBusiness[] = [];

  for (const naf of nafCodes) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = new URL(`${ENTREPRISES_API}/near_point`);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("long", String(lon));
      url.searchParams.set("radius", String(radiusKm));
      url.searchParams.set("activite_principale", naf);
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(PER_PAGE));

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (!response.ok) break;

      const data = (await response.json()) as GouvNearPointResponse;
      const batch = data.results ?? [];
      if (batch.length === 0) break;

      for (const company of batch) {
        if (company.etat_administratif !== "A") continue;

        const establishments = company.matching_etablissements ?? [];
        for (const est of establishments) {
          if (est.etat_administratif !== "A") continue;
          if (est.departement !== department) continue;
          if (!est.siret || seen.has(est.siret)) continue;

          seen.add(est.siret);
          results.push({
            siret: est.siret,
            siren: company.siren,
            name: company.nom_complet ?? "Entreprise",
            city: est.libelle_commune ?? "",
            department,
            nafCode: est.activite_principale ?? naf,
            source: "gouv",
          });
        }
      }

      if (batch.length < PER_PAGE) break;
    }
  }

  return results;
}

export interface FindNearbyOptions {
  city: string;
  department: "59" | "62";
  category: string;
  radiusKm?: number;
}

export async function findNearbyBusinesses(
  options: FindNearbyOptions
): Promise<{ businesses: NearbyBusiness[]; geoFound: boolean }> {
  const radiusKm =
    options.radiusKm ??
    Number(process.env.NEARBY_BUSINESS_RADIUS_KM ?? DEFAULT_RADIUS_KM);

  const store = await readStore();
  const platformMatches = platformProsToNearby(
    store.proRegistrations.filter((p) => p.department === options.department),
    options.category
  );

  const platformSirets = new Set(platformMatches.map((b) => b.siret));

  const coords = await geocodeCity(options.city, options.department);
  if (!coords) {
    return { businesses: platformMatches, geoFound: false };
  }

  const nafCodes = getNafCodesForCategory(options.category);
  const gouvMatches = await fetchGouvNearby({
    lat: coords.lat,
    lon: coords.lon,
    radiusKm,
    nafCodes,
    department: options.department,
  });

  const gouvOnly = gouvMatches.filter((b) => !platformSirets.has(b.siret));

  return {
    businesses: [...platformMatches, ...gouvOnly],
    geoFound: true,
  };
}

/** Artisans joignables par SMS (inscrits + numéro connu). */
export function getSmsEligibleBusinesses(businesses: NearbyBusiness[]): NearbyBusiness[] {
  return businesses.filter(
    (b) => b.source === "platform" && b.phone && b.phone.replace(/\D/g, "").length >= 10
  );
}
