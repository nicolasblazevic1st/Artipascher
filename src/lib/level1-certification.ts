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
    automatic: false,
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
      automatic: false,
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
  const legacyApproved =
    pro.status === "approved" &&
    !pro.level1CertifiedAt &&
    !pro.documents?.some((d) => d.verificationStatus);

  if (legacyApproved) {
    const trades = getProTradeSelections(pro);
    return trades.every((s) => !s.decennaleStatus || s.decennaleStatus === "validé");
  }

  const rcDoc = pro.documents?.find(isRcDocument);
  if (!rcDoc || documentStatus(rcDoc) !== "validé") return false;

  const trades = getProTradeSelections(pro);
  if (trades.length === 0) return false;

  return trades.every((s) => s.decennaleStatus === "validé");
}

export function isLevel1ReadyForAdminReview(pro: ProRegistration): boolean {
  if (!pro.rcsVerified) return false;
  if (!isAllowedDepartment(pro.department) && !pro.level1Audit?.geoVerified) return false;

  const rcDoc = pro.documents?.find(isRcDocument);
  if (!rcDoc) return false;

  return getProTradeSelections(pro).every((s) => s.decennaleDocument);
}

export function canUnlockContacts(pro: ProRegistration): {
  ok: boolean;
  reason?: string;
} {
  if (pro.status !== "approved") {
    return {
      ok: false,
      reason:
        "Votre dossier est en cours de validation. Vous pourrez débloquer les contacts dès certification niveau 1.",
    };
  }

  if (!pro.rcsVerified) {
    return { ok: false, reason: "Vérification RCS requise." };
  }

  if (!isLevel1DocumentsValidated(pro)) {
    return {
      ok: false,
      reason:
        "Certification niveau 1 en cours : RC pro et décennale(s) doivent être validées par notre équipe.",
    };
  }

  return { ok: true };
}

export function canApproveLevel1(pro: ProRegistration): {
  ok: boolean;
  reason?: string;
} {
  if (!isLevel1ReadyForAdminReview(pro)) {
    return { ok: false, reason: "Dossier incomplet (RCS, RC ou décennale manquante)." };
  }

  if (!isLevel1DocumentsValidated(pro)) {
    return {
      ok: false,
      reason: "Validez la RC pro et chaque attestation décennale avant certification.",
    };
  }

  return { ok: true };
}
