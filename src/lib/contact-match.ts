/**
 * Éligibilité d’un pro à débloquer un contact selon les attentes client.
 */

import { getArtisanBySiret } from "./artisans-db";
import { companyAgeCohort } from "./artisans-for-chantier";
import {
  getNafCodesForCategory,
  resolveWorkRequestNafCodes,
} from "./naf-codes";
import { normalizeNafCode } from "./naf-trade-groups";
import { getArtisanProspects } from "./store";
import type { ProRegistration, WorkRequest } from "./store-types";
import {
  TRADE_CATEGORY_TO_WORK,
  WORK_TO_TRADE_CATEGORY,
} from "./work-categories";

export type ContactMatchResult =
  | { ok: true }
  | { ok: false; reason: string };

function proNafCodes(pro: ProRegistration): Set<string> {
  const codes = new Set<string>();
  const workFromTrade = TRADE_CATEGORY_TO_WORK[pro.category];
  if (workFromTrade) {
    for (const c of getNafCodesForCategory(workFromTrade)) {
      codes.add(normalizeNafCode(c));
    }
  }
  return codes;
}

function requestMatchesProTrade(
  request: WorkRequest,
  pro: ProRegistration
): boolean {
  const mappedTrade = WORK_TO_TRADE_CATEGORY[request.category];
  if (mappedTrade && mappedTrade === pro.category) return true;

  const requestNafs = new Set(
    resolveWorkRequestNafCodes(request).map(normalizeNafCode).filter(Boolean)
  );
  if (requestNafs.size === 0) return true;

  const proNafs = proNafCodes(pro);
  for (const code of requestNafs) {
    if (proNafs.has(code)) return true;
  }
  return false;
}

async function resolveProCompanyCreatedAt(
  pro: ProRegistration
): Promise<string | undefined> {
  const fromDb = await getArtisanBySiret(pro.siret);
  if (fromDb?.companyCreatedAt) return fromDb.companyCreatedAt;

  const prospects = await getArtisanProspects();
  const prospect = prospects.find((p) => p.siret === pro.siret);
  return prospect?.companyCreatedAt;
}

/**
 * Vérifie métier/NAF, zone (département) et préférence « entreprise ≥ 2 ans ».
 * Les annonces démo sans critères NAF restent ouvertes aux pros approuvés.
 */
export async function evaluateProContactMatch(
  pro: ProRegistration,
  request: WorkRequest
): Promise<ContactMatchResult> {
  if (pro.department !== request.department) {
    return {
      ok: false,
      reason: `Ce chantier est en ${request.department}. Votre siège est déclaré en ${pro.department}.`,
    };
  }

  if (!requestMatchesProTrade(request, pro)) {
    return {
      ok: false,
      reason:
        "Votre activité ne correspond pas aux métiers / codes NAF attendus pour cette demande.",
    };
  }

  if (request.preferEstablishedCompany === true) {
    const createdAt = await resolveProCompanyCreatedAt(pro);
    if (createdAt && companyAgeCohort(createdAt) === "young") {
      return {
        ok: false,
        reason:
          "Le client souhaite une entreprise créée il y a plus de 2 ans.",
      };
    }
  }

  return { ok: true };
}
