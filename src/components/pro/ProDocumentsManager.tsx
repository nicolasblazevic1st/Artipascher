"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOCUMENT_STATUS_LABELS } from "@/lib/level1-certification";
import { DECENNALE_STATUS_LABELS } from "@/lib/decennale-verification";
import {
  PRO_REGISTRATION_COMPARTMENTS,
  PRO_REGISTRATION_DOCUMENTS,
  proDocumentFieldName,
  tradeDecennaleFieldName,
  type ProRegistrationDocumentType,
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

function DocumentUploadRow({
  docType,
  existing,
  field,
  onFileChange,
}: {
  docType: ProRegistrationDocumentType;
  existing?: ProDocument;
  field: string;
  onFileChange: (field: string, file: File | null) => void;
}) {
  const status =
    existing?.verificationStatus ?? (existing ? "validé" : undefined);
  const statusMeta = status ? DOCUMENT_STATUS_LABELS[status] : null;

  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {docType.label}
            {docType.required ? <span className="text-red-500"> *</span> : null}
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
        onChange={(e) => onFileChange(field, e.target.files?.[0] ?? null)}
      />
      {existing && status === "rejeté" && (
        <p className="text-xs text-red-600">
          Document rejeté — déposez une nouvelle version.
        </p>
      )}
      {!existing && docType.id === "rc" && (
        <p className="text-xs text-amber-700">
          Document obligatoire pour accéder pleinement aux offres.
        </p>
      )}
    </li>
  );
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
      {PRO_REGISTRATION_COMPARTMENTS.filter((c) => c.level === 1).map(
        (compartment) => {
        const docs = compartment.documentIds
          .map((id) => PRO_REGISTRATION_DOCUMENTS.find((doc) => doc.id === id))
          .filter((doc): doc is ProRegistrationDocumentType => doc != null);
        const isLevel1 = compartment.level === 1;

        return (
          <section
            key={compartment.level}
            className={`rounded-xl border ${
              isLevel1
                ? "border-brand-200 bg-brand-50/30"
                : compartment.infoOnly
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="border-b border-slate-200/80 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isLevel1
                      ? "bg-brand-600 text-white"
                      : compartment.infoOnly
                        ? "bg-slate-600 text-white"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {compartment.badge}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  {compartment.title}
                </h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {compartment.summary}
              </p>
            </div>

            {compartment.infoOnly && compartment.infoItems && (
              <ul className="space-y-2 px-4 py-4">
                {compartment.infoItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-slate-600"
                  >
                    <span className="mt-0.5 text-slate-400">○</span>
                    {item}
                  </li>
                ))}
                <li className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                  Téléversement et validation automatique bientôt disponibles.
                </li>
              </ul>
            )}

            {isLevel1 && tradeSelections.length > 0 && (
              <div className="border-t border-brand-100 px-4 py-3">
                <p className="text-xs font-semibold text-slate-900">
                  Attestations décennale
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Une attestation par corps de métier déclaré.
                </p>
              </div>
            )}

            {isLevel1 && tradeSelections.length > 0 && (
              <ul className="divide-y divide-slate-100 border-t border-brand-100">
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
            )}

            {docs.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {docs.map((docType) => (
                  <DocumentUploadRow
                    key={docType.id}
                    docType={docType}
                    existing={documents.find((d) => d.id === docType.id)}
                    field={proDocumentFieldName(docType.id)}
                    onFileChange={setFile}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}

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
