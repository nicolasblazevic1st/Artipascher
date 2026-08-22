/**
 * Résolution du statut RGE d’un pro / artisan (cache + ADEME).
 */

import { getArtisanBySiret, updateArtisanBySiret } from "./artisans-db";
import type { EnrichedArtisan } from "./artisans-types";
import {
  artisanIsRge,
  checkRgeBySiret,
  isRgeCurrentlyValid,
  isRgeSnapshotFresh,
} from "./rge-verification";
import { updateProLevel1Audit } from "./store";
import type { ProRegistration, RgeVerificationSnapshot } from "./store-types";

export { artisanIsRge };

function toArtisanRgePatch(snapshot: RgeVerificationSnapshot): EnrichedArtisan["rge"] {
  return {
    isRge: snapshot.isRge && snapshot.status === "verified",
    status: snapshot.status,
    checkedAt: snapshot.checkedAt,
    domains: snapshot.domains,
    validUntil: snapshot.validUntil,
  };
}

async function persistSnapshot(
  pro: ProRegistration,
  snapshot: RgeVerificationSnapshot
): Promise<void> {
  await updateProLevel1Audit(pro.id, { rge: snapshot });
  await updateArtisanBySiret(pro.siret, { rge: toArtisanRgePatch(snapshot) });
}

/**
 * Statut RGE du pro : cache frais, sinon base artisans, sinon appel ADEME.
 * Persiste le résultat sur le dossier pro et la fiche artisan si un contrôle live a lieu.
 */
export async function resolveProRgeSnapshot(
  pro: ProRegistration,
  options?: { forceRefresh?: boolean }
): Promise<RgeVerificationSnapshot> {
  const cached = pro.level1Audit?.rge;
  if (
    !options?.forceRefresh &&
    cached &&
    isRgeSnapshotFresh(cached) &&
    cached.status !== "unavailable"
  ) {
    return cached;
  }

  if (!options?.forceRefresh) {
    const artisan = await getArtisanBySiret(pro.siret);
    if (
      artisan?.rge &&
      isRgeSnapshotFresh(artisan.rge) &&
      artisan.rge.status !== "unavailable"
    ) {
      const fromDirectory: RgeVerificationSnapshot = {
        status: artisan.rge.status,
        checkedAt: artisan.rge.checkedAt,
        siret: pro.siret,
        isRge: artisan.rge.isRge,
        domains: artisan.rge.domains,
        validUntil: artisan.rge.validUntil,
      };
      if (!cached) {
        await updateProLevel1Audit(pro.id, { rge: fromDirectory });
      }
      return fromDirectory;
    }
  }

  const live = await checkRgeBySiret(pro.siret);
  await persistSnapshot(pro, live);
  return live;
}

export async function resolveProIsRge(
  pro: ProRegistration,
  options?: { forceRefresh?: boolean }
): Promise<boolean> {
  const snapshot = await resolveProRgeSnapshot(pro, options);
  return isRgeCurrentlyValid(snapshot);
}
