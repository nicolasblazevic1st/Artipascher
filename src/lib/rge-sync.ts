/**
 * Synchronisation de l’annuaire RGE ADEME (59 / 62) + dossiers pros inscrits.
 * Importe les établissements RGE absents pour pouvoir ensuite enrichir
 * la note Google (Places) si le particulier la demande.
 */

import {
  addEnrichmentJob,
  applyArtisanRgeSnapshots,
  listArtisans,
  upsertArtisansFromRgeProfiles,
} from "./artisans-db";
import type { EnrichedArtisan } from "./artisans-types";
import { nafCodesFromRgeDomains } from "./rge-naf";
import {
  fetchRgeDirectoryForPostalPrefixes,
  checkRgeBySiret,
  type AdemeRgeProfile,
} from "./rge-verification";
import { listProRegistrations, updateProLevel1Audit } from "./store";
import type { RgeVerificationSnapshot } from "./store-types";

const LOCAL_POSTAL_PREFIXES = ["59", "62"] as const;

export interface RgeSyncResult {
  lineCount: number;
  pages: number;
  uniqueSirets: number;
  artisansInserted: number;
  artisansUpdated: number;
  artisansMarkedRge: number;
  artisansMarkedNotRge: number;
  skippedNoNaf: number;
  prosRefreshed: number;
  prosRge: number;
  errors: string[];
}

function notRgeSnapshot(siret: string, checkedAt: string): RgeVerificationSnapshot {
  return {
    status: "not_rge",
    checkedAt,
    siret,
    isRge: false,
  };
}

function departmentFromPostal(
  postal?: string
): EnrichedArtisan["department"] | null {
  const digits = (postal ?? "").replace(/\D/g, "");
  if (digits.startsWith("59")) return "59";
  if (digits.startsWith("62")) return "62";
  return null;
}

function toArtisanRge(
  snapshot: RgeVerificationSnapshot
): NonNullable<EnrichedArtisan["rge"]> {
  return {
    isRge: snapshot.isRge && snapshot.status === "verified",
    status: snapshot.status,
    checkedAt: snapshot.checkedAt,
    domains: snapshot.domains,
    validUntil: snapshot.validUntil,
  };
}

function profileToUpsertRow(siret: string, profile: AdemeRgeProfile) {
  const department = departmentFromPostal(profile.postalCode);
  if (!department) return null;
  const nafCodes = nafCodesFromRgeDomains(profile.snapshot.domains);
  const companyName =
    profile.companyName?.trim() ||
    profile.snapshot.companyName?.trim() ||
    "Entreprise RGE";
  return {
    siret,
    siren: siret.slice(0, 9),
    companyName,
    addressLine: profile.addressLine?.trim() || profile.city?.trim() || companyName,
    postalCode: profile.postalCode?.trim() || "",
    city: profile.city?.trim() || "",
    department,
    nafCodes,
    lat: profile.lat,
    lon: profile.lon,
    phone: profile.phone,
    website: profile.website,
    rge: toArtisanRge(profile.snapshot),
  };
}

export async function syncRgeDirectory(): Promise<RgeSyncResult> {
  const errors: string[] = [];
  const fetched = await fetchRgeDirectoryForPostalPrefixes(LOCAL_POSTAL_PREFIXES);
  errors.push(...fetched.errors);

  const checkedAt = new Date().toISOString();
  const upsertRows = [];
  let skippedNoNaf = 0;
  for (const [siret, profile] of fetched.bySiret) {
    if (!profile.snapshot.isRge || profile.snapshot.status !== "verified") {
      continue;
    }
    const row = profileToUpsertRow(siret, profile);
    if (!row) {
      skippedNoNaf += 1;
      continue;
    }
    if (row.nafCodes.length === 0) skippedNoNaf += 1;
    upsertRows.push(row);
  }

  const upserted = await upsertArtisansFromRgeProfiles(upsertRows);

  const local = (await listArtisans()).filter(
    (a) => a.department === "59" || a.department === "62"
  );
  const notRgeUpdates = local
    .filter((artisan) => !fetched.bySiret.has(artisan.siret))
    .map((artisan) => ({
      siret: artisan.siret,
      rge: notRgeSnapshot(artisan.siret, checkedAt),
    }));
  const cleared = await applyArtisanRgeSnapshots(notRgeUpdates);

  const { refreshed: prosRefreshed, rgeCount: prosRge } =
    await refreshRegisteredProsRge(
      new Map(
        [...fetched.bySiret].map(([siret, profile]) => [siret, profile.snapshot])
      )
    );

  await addEnrichmentJob({
    kind: "rge_sync",
    ranAt: checkedAt,
    requestsSpent: fetched.pages,
    processed: upserted.inserted + upserted.updated + cleared.updated + prosRefreshed,
    skipped: skippedNoNaf,
    errors,
    note: `${fetched.bySiret.size} SIRET ADEME · +${upserted.inserted} fiches · ${upserted.markedRge} RGE`,
  });

  return {
    lineCount: fetched.lineCount,
    pages: fetched.pages,
    uniqueSirets: fetched.bySiret.size,
    artisansInserted: upserted.inserted,
    artisansUpdated: upserted.updated,
    artisansMarkedRge: upserted.markedRge,
    artisansMarkedNotRge: cleared.markedNotRge,
    skippedNoNaf,
    prosRefreshed,
    prosRge,
    errors,
  };
}

async function refreshRegisteredProsRge(
  directory: Map<string, RgeVerificationSnapshot>
): Promise<{ refreshed: number; rgeCount: number }> {
  const pros = await listProRegistrations();
  let refreshed = 0;
  let rgeCount = 0;

  for (const pro of pros) {
    let snapshot = directory.get(pro.siret);
    if (!snapshot) {
      snapshot = await checkRgeBySiret(pro.siret);
    }
    await updateProLevel1Audit(pro.id, { rge: snapshot });
    refreshed += 1;
    if (snapshot.isRge && snapshot.status === "verified") rgeCount += 1;
  }

  return { refreshed, rgeCount };
}
