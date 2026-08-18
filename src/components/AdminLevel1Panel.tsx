"use client";

import {
  bodaccAnnouncementUrl,
  bodaccCollectiveSearchUrl,
} from "@/lib/bodacc";
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
  const bodacc = registration.level1Audit?.bodacc;
  const bodaccSearchUrl = bodaccCollectiveSearchUrl(registration.siren);
  const bodaccDetailUrl = bodacc
    ? bodaccAnnouncementUrl({
        url: bodacc.url,
        announcementId: bodacc.announcementId,
      })
    : null;

  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            Certification niveau 1 — automatique
          </p>
          <p className="mt-1 text-xs text-slate-600">
            RCS, BODACC, PDF RC/décennale · sans Kbis · auto
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

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm font-medium text-slate-900">
          Dirigeants (registre)
        </p>
        {registration.legalRepresentatives &&
        registration.legalRepresentatives.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {registration.legalRepresentatives.map((rep) => (
              <li key={`${rep.fullName}-${rep.role ?? ""}`}>
                <span className="font-medium">{rep.fullName}</span>
                {rep.role ? (
                  <span className="text-slate-500"> — {rep.role}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Aucun dirigeant renvoyé par le registre pour ce SIRET.
          </p>
        )}
      </div>

      {registration.paymentNameCheck && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            registration.paymentNameCheck.status === "match"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : registration.paymentNameCheck.status === "mismatch"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          <p className="font-semibold">
            {registration.paymentNameCheck.status === "match"
              ? "Nom CB cohérent"
              : registration.paymentNameCheck.status === "mismatch"
                ? "Nom CB différent des dirigeants — à surveiller"
                : "Nom CB non disponible pour contrôle"}
          </p>
          {registration.paymentNameCheck.cardName && (
            <p className="mt-0.5 opacity-90">
              Carte / facturation : {registration.paymentNameCheck.cardName}
            </p>
          )}
          {registration.paymentNameCheck.matchedAgainst && (
            <p className="mt-0.5 opacity-80">
              Correspond à : {registration.paymentNameCheck.matchedAgainst}
            </p>
          )}
          <p className="mt-0.5 opacity-70">
            Contrôle du{" "}
            {new Date(
              registration.paymentNameCheck.checkedAt
            ).toLocaleString("fr-FR")}
          </p>
        </div>
      )}

      <div
        className={`mt-3 rounded-lg border px-3 py-3 text-xs ${
          !bodacc
            ? "border-slate-200 bg-white text-slate-700"
            : bodacc.status === "clear"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : bodacc.status === "active_procedure"
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-amber-200 bg-amber-50 text-amber-950"
        }`}
      >
        <p className="font-semibold">
          {!bodacc
            ? "BODACC : pas encore contrôlé à l'inscription"
            : bodacc.status === "clear"
              ? "BODACC : aucune procédure collective active"
              : bodacc.status === "active_procedure"
                ? "BODACC : procédure collective détectée"
                : "BODACC : contrôle indisponible"}
        </p>
        {bodacc?.nature && (
          <p className="mt-0.5 opacity-90">
            {bodacc.nature}
            {bodacc.dateParution ? ` · ${bodacc.dateParution}` : ""}
          </p>
        )}
        {bodacc?.error && (
          <p className="mt-0.5 opacity-80">{bodacc.error}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {bodaccDetailUrl ? (
            <a
              href={bodaccDetailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Ouvrir l&apos;annonce signalée
            </a>
          ) : null}
          <a
            href={bodaccSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            Consulter BODACC (SIREN {registration.siren})
          </a>
        </div>
        {bodacc && (
          <p className="mt-2 opacity-70">
            Contrôle du {new Date(bodacc.checkedAt).toLocaleString("fr-FR")}
          </p>
        )}
      </div>

      {rcDoc && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-900">
                RC professionnelle
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  DOCUMENT_STATUS_LABELS[
                    rcDoc.verificationStatus ?? "en_attente_verification"
                  ].className
                }`}
              >
                {
                  DOCUMENT_STATUS_LABELS[
                    rcDoc.verificationStatus ?? "en_attente_verification"
                  ].text
                }
              </span>
            </div>
            <a
              href={rcDoc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
            >
              Ouvrir le PDF RC
            </a>
          </div>
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
