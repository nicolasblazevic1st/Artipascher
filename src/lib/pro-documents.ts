export interface ProRegistrationDocumentType {
  id: string;
  label: string;
  help: string;
  required: boolean;
  /** Niveau de qualification Artipascher (1 = inscription rapide). */
  qualificationLevel: 1 | 2 | 3;
}

export const PRO_REGISTRATION_DOCUMENTS: ProRegistrationDocumentType[] = [
  {
    id: "kbis",
    label: "KBIS / extrait RCS (< 3 mois)",
    help: "Optionnel : le SIRET est déjà vérifié en direct au registre (RNE). Joignez un KBIS récent pour accélérer la validation.",
    required: false,
    qualificationLevel: 1,
  },
  {
    id: "rc",
    label: "Assurance responsabilité civile professionnelle",
    help: "Attestation ou contrat en cours de validité.",
    required: true,
    qualificationLevel: 1,
  },
  {
    id: "rge",
    label: "Label RGE",
    help: "Pour la rénovation énergétique (isolation, chauffage, fenêtres…).",
    required: false,
    qualificationLevel: 2,
  },
  {
    id: "qualibat",
    label: "Qualibat ou qualification métier",
    help: "Certification de compétence reconnue dans votre corps de métier.",
    required: false,
    qualificationLevel: 2,
  },
];

export interface ProRegistrationDocumentCompartment {
  level: 1 | 2 | 3;
  badge: string;
  title: string;
  summary: string;
  /** Documents uploadables dans ce compartiment (hors décennale par métier). */
  documentIds: string[];
  /** Attestations décennale par corps de métier (niveau 1 uniquement). */
  includesDecennale?: boolean;
  /** Compartiment informatif sans upload à l'inscription. */
  infoOnly?: boolean;
  infoItems?: string[];
}

export const PRO_REGISTRATION_COMPARTMENTS: ProRegistrationDocumentCompartment[] = [
  {
    level: 1,
    badge: "Certifié",
    title: "Documents obligatoires",
    summary:
      "Documents vérifiés pour accéder aux offres et débloquer les contacts clients.",
    documentIds: ["rc", "kbis"],
    includesDecennale: true,
  },
];

export function proDocumentsForLevel(level: 1 | 2 | 3): ProRegistrationDocumentType[] {
  return PRO_REGISTRATION_DOCUMENTS.filter((doc) => doc.qualificationLevel === level);
}

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
