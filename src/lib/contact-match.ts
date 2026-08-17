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
import {
  isLevel1DocumentsValidated,
  listMissingVerificationDocuments,
} from "./level1-certification";
import { getArtisanProspects } from "./store";
import type { ProRegistration, WorkRequest } from "./store-types";
import { parseMinGoogleRating } from "./google-rating";
import {
  TRADE_CATEGORY_TO_WORK,
  WORK_TO_TRADE_CATEGORY,
} from "./work-categories";

export { MIN_GOOGLE_RATING_OPTIONS, parseMinGoogleRating } from "./google-rating";

export type ContactMatchCode = "verification" | "criteria";

export type ContactMatchResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      code: ContactMatchCode;
      missingItems?: string[];
    };

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

async function resolveProGoogleRating(
  pro: ProRegistration
): Promise<number | undefined> {
  const fromDb = await getArtisanBySiret(pro.siret);
  if (
    typeof fromDb?.googleRating === "number" &&
    Number.isFinite(fromDb.googleRating)
  ) {
    return fromDb.googleRating;
  }
  return undefined;
}

/**
 * Critères client pour débloquer un contact (consultation libre tous départements) :
 * métier/NAF, entreprise active, RC + décennale, ancienneté, note Google.
 * Les annonces démo sans critères NAF restent ouvertes aux pros approuvés.
 */
export async function evaluateProContactMatch(
  pro: ProRegistration,
  request: WorkRequest
): Promise<ContactMatchResult> {
  if (!requestMatchesProTrade(request, pro)) {
    return {
      ok: false,
      code: "criteria",
      reason:
        "Votre activité ne correspond pas aux métiers / codes NAF attendus pour cette demande.",
    };
  }

  // Critères indécocheables côté particulier (toujours exigés).
  const requireActive = request.requireActiveCompany !== false;
  if (requireActive) {
    const artisan = await getArtisanBySiret(pro.siret);
    if (artisan?.status === "closed") {
      return {
        ok: false,
        code: "verification",
        reason:
          "Le client n’accepte que les entreprises au statut normal (hors liquidation / cessation).",
        missingItems: ["Entreprise active (pas fermée)"],
      };
    }
  }

  const requireInsurances = request.requireValidInsurances !== false;
  if (requireInsurances && !isLevel1DocumentsValidated(pro)) {
    const missingItems = listMissingVerificationDocuments(pro);
    return {
      ok: false,
      code: "verification",
      reason:
        "Le client exige une décennale et une assurance RC professionnelle à jour (validées).",
      missingItems:
        missingItems.length > 0
          ? missingItems
          : ["RC professionnelle", "Décennale"],
    };
  }

  if (request.preferEstablishedCompany === true) {
    const createdAt = await resolveProCompanyCreatedAt(pro);
    if (createdAt && companyAgeCohort(createdAt) === "young") {
      return {
        ok: false,
        code: "criteria",
        reason:
          "Le client souhaite une entreprise créée il y a 5 ans ou plus.",
      };
    }
  } else if (request.preferEstablishedCompany === false) {
    const createdAt = await resolveProCompanyCreatedAt(pro);
    if (!createdAt || companyAgeCohort(createdAt) !== "young") {
      return {
        ok: false,
        code: "criteria",
        reason:
          "Le client souhaite une entreprise créée il y a moins de 5 ans.",
      };
    }
  }

  const minRating = parseMinGoogleRating(request.minGoogleRating);
  if (minRating != null) {
    const rating = await resolveProGoogleRating(pro);
    if (rating != null && rating < minRating) {
      return {
        ok: false,
        code: "criteria",
        reason: `Le client souhaite une note Google d’au moins ${minRating.toFixed(1).replace(".", ",")}/5 (votre fiche : ${rating.toFixed(1).replace(".", ",")}).`,
      };
    }
  }

  return { ok: true };
}
