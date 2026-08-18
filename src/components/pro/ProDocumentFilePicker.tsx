"use client";

import { useId, useRef } from "react";

/** PDF uniquement (attestation assureur originale). */
export const PRO_DOCUMENT_PDF_ACCEPT = ".pdf,application/pdf";

/** Fichiers (PDF + images) — documents non critiques. */
export const PRO_DOCUMENT_FILE_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

type Props = {
  id?: string;
  disabled?: boolean;
  /** Nom affiché du fichier déjà choisi (contrôle externe). */
  selectedFileName?: string | null;
  onChange: (file: File | null) => void;
  className?: string;
  /**
   * RC / décennale : uniquement le PDF original de l’assureur.
   * Sinon : PDF ou fichier image.
   */
  originalPdfOnly?: boolean;
};

/** Sélecteur document pro — fichier uniquement, pas de prise de photo. */
export default function ProDocumentFilePicker({
  id,
  disabled = false,
  selectedFileName,
  onChange,
  className = "",
  originalPdfOnly = false,
}: Props) {
  const autoId = useId();
  const fileId = id ?? `${autoId}-file`;
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePick(file: File | null) {
    onChange(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor={fileId}
        className={`inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-center text-sm font-medium text-brand-800 shadow-sm hover:bg-brand-100 ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {originalPdfOnly ? "Joindre le PDF original" : "Joindre un fichier"}
        <input
          ref={fileRef}
          id={fileId}
          type="file"
          accept={originalPdfOnly ? PRO_DOCUMENT_PDF_ACCEPT : PRO_DOCUMENT_FILE_ACCEPT}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
        />
      </label>
      <p className="text-xs text-slate-500">
        {originalPdfOnly
          ? "Utilisez le PDF reçu de votre assureur (e-mail ou espace client), sans le modifier."
          : "Préférez un PDF officiel."}
      </p>
      {selectedFileName ? (
        <p className="text-xs font-medium text-brand-700">
          Fichier sélectionné : {selectedFileName}
        </p>
      ) : null}
    </div>
  );
}
