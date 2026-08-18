import { isAllowedDepartment } from "./rcs";
import { getProTradeSelections } from "./pro-trades";
import type {
  DocumentVerificationStatus,
  Level1CheckItem,
  Level1ConsistencyIssue,
  ProDocument,
  ProRegistration,
} from "./store-types";

export const DOCUMENT_STATUS_LABELS: Record<
  DocumentVerificationStatus,
  { text: string; className: string }
> = {
  en_attente_verification: {
    text: "En attente",
    className: "bg-amber-100 text-amber-800",
  },
  validé: {
    text: "Validé",
    className: "bg-emerald-100 text-emerald-800",
  },
  rejeté: {
    text: "Rejeté",
    className: "bg-red-100 text-red-800",
  },
};

export function defaultDocumentVerificationStatus(): DocumentVerificationStatus {
  return "en_attente_verification";
}

function documentStatus(doc: ProDocument | undefined): DocumentVerificationStatus {
  if (!doc) return "en_attente_verification";
  return doc.verificationStatus ?? "validé";
}

function isRcDocument(doc: ProDocument): boolean {
  return doc.id === "rc";
}

export function getLevel1Checks(pro: ProRegistration): Level1CheckItem[] {
  const checks: Level1CheckItem[] = [];

  checks.push({
    id: "rcs",
    label: "Vérification SIREN / RNE",
    status: pro.rcsVerified ? "ok" : "missing",
    detail: pro.rcsVerified
      ? `SIREN ${pro.siren} · ${pro.companyName}`
      : "Non vérifié au registre",
    automatic: true,
  });

  const geoOk =
    pro.level1Audit?.geoVerified === true || isAllowedDepartment(pro.department);
  checks.push({
    id: "geo",
    label: "Zone géographique (59 / 62)",
    status: geoOk ? "ok" : "missing",
    detail: geoOk
      ? `${pro.city} (${pro.department})`
      : "Établissement hors Nord / Pas-de-Calais",
    automatic: true,
  });

  const bodacc = pro.level1Audit?.bodacc;
  checks.push({
    id: "bodacc",
    label: "BODACC (procédures collectives)",
    status: !bodacc
      ? "pending"
      : bodacc.status === "clear"
        ? "ok"
        : bodacc.status === "active_procedure"
          ? "rejected"
          : "pending",
    detail: !bodacc
      ? "Pas encore contrôlé"
      : bodacc.status === "clear"
        ? "Aucune procédure collective active"
        : bodacc.status === "active_procedure"
          ? bodacc.nature ?? "Procédure collective détectée"
          : bodacc.error ?? "API BODACC indisponible",
    automatic: true,
  });

  const rcDoc = pro.documents?.find(isRcDocument);
  const rcStatus = documentStatus(rcDoc);
  checks.push({
    id: "rc",
    label: "Assurance RC professionnelle",
    status:
      rcStatus === "validé"
        ? "ok"
        : rcStatus === "rejeté"
          ? "rejected"
          : rcDoc
            ? "pending"
            : "missing",
    detail: rcDoc ? rcDoc.fileName : "Document manquant",
    automatic: true,
  });

  for (const selection of getProTradeSelections(pro)) {
    const decStatus = selection.decennaleStatus ?? "en_attente_verification";
    checks.push({
      id: `decennale-${selection.tradeGroupId}`,
      label: `Décennale · ${selection.tradeGroupLabel}`,
      status:
        decStatus === "validé"
          ? "ok"
          : decStatus === "non_couvert"
            ? "rejected"
            : selection.decennaleDocument
              ? "pending"
              : "missing",
      detail: selection.decennaleDocument?.fileName ?? "Attestation manquante",
      automatic: true,
    });
  }

  return checks;
}

export function getLevel1ConsistencyIssues(pro: ProRegistration): Level1ConsistencyIssue[] {
  const global = pro.level1Audit?.globalIssues ?? [];
  const docIssues =
    pro.documents?.flatMap((doc) => doc.consistencyIssues ?? []) ?? [];
  return [...global, ...docIssues];
}

export function isLevel1DocumentsValidated(pro: ProRegistration): boolean {
  return listMissingVerificationDocuments(pro).length === 0;
}

/** Documents / validations manquants pour débloquer un contact. */
export function listMissingVerificationDocuments(
  pro: ProRegistration
): string[] {
  const missing: string[] = [];

  const legacyApproved =
    pro.status === "approved" &&
    !pro.level1CertifiedAt &&
    !pro.documents?.some((d) => d.verificationStatus);

  if (legacyApproved) {
    const trades = getProTradeSelections(pro);
    for (const s of trades) {
      if (s.decennaleStatus && s.decennaleStatus !== "validé") {
        const trade =
          s.qualibatJobLabel || s.tradeGroupLabel || "votre métier";
        missing.push(
          s.decennaleStatus === "non_couvert"
            ? `Décennale (${trade}) — à renvoyer`
            : `Décennale (${trade}) — en cours de validation`
        );
      }
    }
    return missing;
  }

  const rcDoc = pro.documents?.find(isRcDocument);
  const rcStatus = documentStatus(rcDoc);
  if (!rcDoc || rcStatus !== "validé") {
    if (!rcDoc) missing.push("RC professionnelle");
    else if (rcStatus === "rejeté")
      missing.push("RC professionnelle — à renvoyer");
    else missing.push("RC professionnelle — en cours de validation");
  }

  const trades = getProTradeSelections(pro);
  if (trades.length === 0) {
    missing.push("Décennale");
  } else {
    for (const s of trades) {
      if (s.decennaleStatus === "validé") continue;
      const trade = s.qualibatJobLabel || s.tradeGroupLabel || "votre métier";
      if (!s.decennaleStatus) missing.push(`Décennale (${trade})`);
      else if (s.decennaleStatus === "non_couvert")
        missing.push(`Décennale (${trade}) — à renvoyer`);
      else missing.push(`Décennale (${trade}) — en cours de validation`);
    }
  }

  return missing;
}

export function isLevel1Certified(pro: ProRegistration): boolean {
  return Boolean(pro.level1CertifiedAt) && pro.status === "approved" && isLevel1DocumentsValidated(pro);
}

export function isLevel1ReadyForAdminReview(pro: ProRegistration): boolean {
  return isLevel1Certified(pro);
}

export function canUnlockContacts(pro: ProRegistration): {
  ok: boolean;
  reason?: string;
  missingItems?: string[];
} {
  if (pro.status !== "approved") {
    const missingItems = listMissingVerificationDocuments(pro);
    return {
      ok: false,
      reason:
        "Certification niveau 1 non obtenue. Vérifiez vos documents (RC pro et décennale) et réinscrivez-vous si besoin.",
      missingItems:
        missingItems.length > 0
          ? missingItems
          : ["RC professionnelle", "Décennale"],
    };
  }

  if (!pro.rcsVerified) {
    return {
      ok: false,
      reason: "Vérification RCS requise.",
      missingItems: ["Vérification RCS"],
    };
  }

  if (!isLevel1Certified(pro) && !isLevel1DocumentsValidated(pro)) {
    const missingItems = listMissingVerificationDocuments(pro);
    return {
      ok: false,
      reason:
        "Certification niveau 1 incomplète : RC pro et décennale(s) doivent être validées automatiquement.",
      missingItems:
        missingItems.length > 0
          ? missingItems
          : ["RC professionnelle", "Décennale"],
    };
  }

  return { ok: true };
}
