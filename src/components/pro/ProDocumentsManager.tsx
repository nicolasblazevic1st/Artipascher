"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DOCUMENT_STATUS_LABELS,
} from "@/lib/level1-certification";
import { DECENNALE_STATUS_LABELS } from "@/lib/decennale-verification";
import {
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  tradeDecennaleFieldName,
} from "@/lib/pro-documents";
import type {
  DecennaleVerificationStatus,
  ProDocument,
  ProTradeSelection,
} from "@/lib/store-types";

interface Props {
  documents: ProDocument[];
  tradeSelections: ProTradeSelection[];
}

export default function ProDocumentsManager({ documents, tradeSelections }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function setFile(key: string, file: File | null) {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    let count = 0;
    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      formData.set(key, file);
      count += 1;
    }

    if (count === 0) {
      setError("Sélectionnez au moins un fichier.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/pro/documents", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Envoi impossible.");
      return;
    }

    setFiles({});
    setSuccess("Documents envoyés. Ils seront vérifiés par notre équipe.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {PRO_REGISTRATION_DOCUMENTS.map((docType) => {
          const existing = documents.find((d) => d.id === docType.id);
          const status =
            existing?.verificationStatus ??
            (existing ? "validé" : undefined);
          const statusMeta = status
            ? DOCUMENT_STATUS_LABELS[status]
            : null;
          const field = proDocumentFieldName(docType.id);

          return (
            <li key={docType.id} className="space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {docType.label}
                    {docType.required ? (
                      <span className="text-red-500"> *</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{docType.help}</p>
                  {existing && (
                    <a
                      href={existing.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                    >
                      Voir le fichier actuel ({existing.fileName})
                    </a>
                  )}
                </div>
                {statusMeta ? (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
                  >
                    {statusMeta.text}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Non transmis
                  </span>
                )}
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
                onChange={(e) => setFile(field, e.target.files?.[0] ?? null)}
              />
              {existing && status === "rejeté" && (
                <p className="text-xs text-red-600">
                  Document rejeté — déposez une nouvelle version.
                </p>
              )}
              {!existing && docType.id === "rc" && (
                <p className="text-xs text-amber-700">
                  Document obligatoire pour accéder pleinement aux enchères.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {tradeSelections.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Décennale par corps de métier
          </h3>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {tradeSelections.map((selection) => {
              const status: DecennaleVerificationStatus =
                selection.decennaleStatus ?? "en_attente_verification";
              const meta = DECENNALE_STATUS_LABELS[status];
              const field = tradeDecennaleFieldName(selection.tradeGroupId);

              return (
                <li key={selection.tradeGroupId} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {selection.tradeGroupLabel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selection.qualibatJobLabel}
                      </p>
                      {selection.decennaleDocument && (
                        <a
                          href={selection.decennaleDocument.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                        >
                          Voir l&apos;attestation (
                          {selection.decennaleDocument.fileName})
                        </a>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
                    >
                      {meta.text}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
                    onChange={(e) => setFile(field, e.target.files?.[0] ?? null)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {loading ? "Envoi…" : "Envoyer les documents sélectionnés"}
      </button>
    </form>
  );
}
