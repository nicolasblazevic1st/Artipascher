"use client";

import {
  canApproveLevel1,
  DOCUMENT_STATUS_LABELS,
  getLevel1Checks,
  getLevel1ConsistencyIssues,
} from "@/lib/level1-certification";
import type { DocumentVerificationStatus, ProRegistration } from "@/lib/store-types";

const CHECK_STATUS = {
  ok: { icon: "✓", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  pending: { icon: "…", className: "text-amber-700 bg-amber-50 border-amber-200" },
  missing: { icon: "!", className: "text-red-700 bg-red-50 border-red-200" },
  rejected: { icon: "✕", className: "text-red-700 bg-red-50 border-red-200" },
};

interface Props {
  registration: ProRegistration;
  onValidateDocument: (documentId: string, status: Extract<DocumentVerificationStatus, "validé" | "rejeté">) => void;
  onCertifyLevel1: () => void;
}

export default function AdminLevel1Panel({
  registration,
  onValidateDocument,
  onCertifyLevel1,
}: Props) {
  const checks = getLevel1Checks(registration);
  const issues = getLevel1ConsistencyIssues(registration);
  const rcDoc = registration.documents?.find((d) => d.id === "rc");
  const approveCheck = canApproveLevel1(registration);

  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            Certification niveau 1 — Essentiel
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Vérifications automatiques + contrôle OCR · validation en 30–60 secondes
          </p>
        </div>
        {registration.level1CertifiedAt && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Certifié le {new Date(registration.level1CertifiedAt).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {checks.map((check) => {
          const meta = CHECK_STATUS[check.status];
          return (
            <li
              key={check.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${meta.className}`}
            >
              <span className="font-bold">{meta.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{check.label}</p>
                <p className="text-xs opacity-80">{check.detail}</p>
                {check.automatic && (
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                    Automatique
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {rcDoc && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-900">RC professionnelle</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  DOCUMENT_STATUS_LABELS[rcDoc.verificationStatus ?? "en_attente_verification"]
                    .className
                }`}
              >
                {
                  DOCUMENT_STATUS_LABELS[rcDoc.verificationStatus ?? "en_attente_verification"]
                    .text
                }
              </span>
            </div>
            <a
              href={rcDoc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Ouvrir le fichier
            </a>
          </div>
          {rcDoc.ocrHints?.rawSnippet && (
            <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
              OCR : {rcDoc.ocrHints.rawSnippet}
              {rcDoc.ocrHints.insurer && (
                <span className="mt-1 block font-medium">
                  Assureur détecté : {rcDoc.ocrHints.insurer}
                </span>
              )}
            </p>
          )}
          {(rcDoc.verificationStatus ?? "en_attente_verification") ===
            "en_attente_verification" && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onValidateDocument("rc", "validé")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Valider RC
              </button>
              <button
                type="button"
                onClick={() => onValidateDocument("rc", "rejeté")}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Rejeter
              </button>
            </div>
          )}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Contrôle de cohérence OCR
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {issues.map((issue, index) => (
              <li key={`${issue.field}-${index}`}>
                <strong>{issue.field}</strong> — {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {registration.status === "pending" && (
        <div className="mt-4 flex flex-col items-end gap-2 border-t border-brand-200 pt-4">
          {!approveCheck.ok && (
            <p className="text-right text-xs text-slate-500">{approveCheck.reason}</p>
          )}
          <button
            type="button"
            onClick={onCertifyLevel1}
            disabled={!approveCheck.ok}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Certifier niveau 1 et débloquer les contacts
          </button>
        </div>
      )}
    </div>
  );
}
