export interface ProRegistrationDocumentType {
  id: string;
  label: string;
  help: string;
  required: boolean;
}

export const PRO_REGISTRATION_DOCUMENTS: ProRegistrationDocumentType[] = [
  {
    id: "kbis",
    label: "KBIS / extrait RCS (< 3 mois)",
    help: "Document officiel prouvant l'immatriculation de votre entreprise.",
    required: true,
  },
  {
    id: "rc",
    label: "Assurance responsabilité civile professionnelle",
    help: "Attestation ou contrat en cours de validité.",
    required: true,
  },
  {
    id: "rge",
    label: "Label RGE",
    help: "Pour la rénovation énergétique (isolation, chauffage, fenêtres…).",
    required: false,
  },
  {
    id: "qualibat",
    label: "Qualibat ou qualification métier",
    help: "Certification de compétence reconnue dans votre corps de métier.",
    required: false,
  },
];

export const MAX_PRO_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_PRO_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function proDocumentFieldName(id: string) {
  return `doc_${id}`;
}

/** Champ upload attestation décennale par corps de métier (ex. doc_decennale_peinture). */
export function tradeDecennaleFieldName(tradeGroupId: string) {
  return `doc_decennale_${tradeGroupId}`;
}

export function validateTradeDecennaleDocuments(
  tradeGroupIds: string[],
  files: Record<string, File | null | undefined>
): string | null {
  for (const groupId of tradeGroupIds) {
    const file = files[groupId];
    const error = validateProDocumentFile(file!);
    if (error) {
      const label =
        error === "Fichier manquant."
          ? "attestation décennale obligatoire pour chaque corps de métier coché."
          : error;
      return `Corps de métier « ${groupId} » : ${label}`;
    }
  }
  return null;
}

export function validateProDocumentFile(file: File): string | null {
  if (!file || file.size === 0) {
    return "Fichier manquant.";
  }
  if (
    !ALLOWED_PRO_DOCUMENT_TYPES.includes(
      file.type as (typeof ALLOWED_PRO_DOCUMENT_TYPES)[number]
    )
  ) {
    return "Format non accepté. Utilisez JPG, PNG, WebP ou PDF.";
  }
  if (file.size > MAX_PRO_DOCUMENT_SIZE_BYTES) {
    return `Chaque document doit faire moins de ${MAX_PRO_DOCUMENT_SIZE_BYTES / 1024 / 1024} Mo.`;
  }
  return null;
}

export function validateProRegistrationDocuments(
  files: Record<string, File | null | undefined>
): string | null {
  for (const doc of PRO_REGISTRATION_DOCUMENTS) {
    const file = files[doc.id];
    if (doc.required) {
      const error = validateProDocumentFile(file!);
      if (error) {
        return `${doc.label} : ${error === "Fichier manquant." ? "document obligatoire." : error}`;
      }
    } else if (file && file.size > 0) {
      const error = validateProDocumentFile(file);
      if (error) return `${doc.label} : ${error}`;
    }
  }
  return null;
}
