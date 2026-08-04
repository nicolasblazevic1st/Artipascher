"use client";

import {
  DOCUMENT_STATUS_LABELS,
  getLevel1Checks,
  getLevel1ConsistencyIssues,
  isLevel1Certified,
} from "@/lib/level1-certification";
import type { ProRegistration } from "@/lib/store-types";

const CHECK_STATUS = {
  ok: { icon: "✓", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  pending: { icon: "…", className: "text-amber-700 bg-amber-50 border-amber-200" },
  missing: { icon: "!", className: "text-red-700 bg-red-50 border-red-200" },
  rejected: { icon: "✕", className: "text-red-700 bg-red-50 border-red-200" },
};

interface Props {
  registration: ProRegistration;
}

export default function AdminLevel1Panel({ registration }: Props) {
  const checks = getLevel1Checks(registration);
  const issues = getLevel1ConsistencyIssues(registration);
  const rcDoc = registration.documents?.find((d) => d.id === "rc");
  const certified = isLevel1Certified(registration);

  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            Certification niveau 1 — automatique
          </p>
          <p className="mt-1 text-xs text-slate-600">
            RCS, zone, OCR et cohérence · sans validation manuelle admin
          </p>
        </div>
        {certified && registration.level1CertifiedAt && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Certifié le {new Date(registration.level1CertifiedAt).toLocaleDateString("fr-FR")}
          </span>
        )}
        {registration.status === "rejected" && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Refusé automatiquement
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
              </div>
            </li>
          );
        })}
      </ul>

      {rcDoc && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-medium text-slate-900">RC professionnelle</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              DOCUMENT_STATUS_LABELS[rcDoc.verificationStatus ?? "en_attente_verification"]
                .className
            }`}
          >
            {DOCUMENT_STATUS_LABELS[rcDoc.verificationStatus ?? "en_attente_verification"].text}
          </span>
          {rcDoc.ocrHints?.rawSnippet && (
            <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
              OCR : {rcDoc.ocrHints.rawSnippet}
            </p>
          )}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Contrôle OCR
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

      {registration.adminNote && registration.status === "rejected" && (
        <p className="mt-3 text-xs text-red-700">{registration.adminNote}</p>
      )}
    </div>
  );
}
