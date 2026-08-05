export const MIN_DESCRIPTION_LENGTH = 100;
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
export const MAX_PROOF_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function validateDescription(description: unknown): string | null {
  if (typeof description !== "string") {
    return "La description est obligatoire.";
  }
  const trimmed = description.trim();
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    return `La description doit contenir au moins ${MIN_DESCRIPTION_LENGTH} caractères (${trimmed.length}/${MIN_DESCRIPTION_LENGTH}).`;
  }
  return null;
}

export function validatePhotoFiles(files: File[]): string | null {
  if (files.length === 0) {
    return "Ajoutez au moins une photo de votre projet.";
  }
  if (files.length > MAX_PHOTOS) {
    return `Maximum ${MAX_PHOTOS} photos autorisées.`;
  }
  for (const file of files) {
    const fileError = validatePhotoFile(file);
    if (fileError) return fileError;
  }
  return null;
}

/** Valide un fichier photo individuel (sans exiger un nombre minimum). */
export function validatePhotoFile(file: File): string | null {
  if (!file || file.size === 0) {
    return "Fichier photo manquant.";
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return "Format non accepté. Utilisez JPG, PNG ou WebP.";
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return `Chaque photo doit faire moins de ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024} Mo.`;
  }
  return null;
}

export function validatePreviousQuoteAmount(amountRaw: unknown): string | null {
  if (amountRaw === null || amountRaw === undefined || amountRaw === "") {
    return null;
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return "Indiquez un montant de devis valide (nombre entier en euros).";
  }
  if (amount > 10_000_000) {
    return "Le montant du devis semble trop élevé.";
  }
  return null;
}

export function validateProofFile(file: File | null | undefined): string | null {
  if (!file || file.size === 0) {
    return "Joignez une photo ou un PDF du devis reçu.";
  }
  if (!ALLOWED_PROOF_TYPES.includes(file.type as (typeof ALLOWED_PROOF_TYPES)[number])) {
    return "Justificatif non accepté. Utilisez JPG, PNG, WebP ou PDF.";
  }
  if (file.size > MAX_PROOF_SIZE_BYTES) {
    return `Le justificatif doit faire moins de ${MAX_PROOF_SIZE_BYTES / 1024 / 1024} Mo.`;
  }
  return null;
}

const MAX_WORK_START_MONTHS_AHEAD = 24;

export function validateRequestedWorkStartDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return "Indiquez la date de début de travaux souhaitée.";
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "Date de début de travaux invalide.";
  }

  const date = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Date de début de travaux invalide.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDay = new Date(date);
  startDay.setHours(0, 0, 0, 0);

  if (startDay < today) {
    return "La date de début de travaux doit être aujourd'hui ou ultérieure.";
  }

  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + MAX_WORK_START_MONTHS_AHEAD);
  if (startDay > maxDate) {
    return `La date de début ne peut pas dépasser ${MAX_WORK_START_MONTHS_AHEAD} mois.`;
  }

  return null;
}

export function formatRequestedWorkStartDate(isoDate: string | undefined): string {
  if (!isoDate) return "Non renseignée";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function minRequestedWorkStartDate(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function validatePreviousQuotePair(
  amountRaw: unknown,
  proofFile: File | null | undefined
): string | null {
  const hasAmount =
    amountRaw !== null && amountRaw !== undefined && String(amountRaw).trim() !== "";
  const hasProof = proofFile != null && proofFile.size > 0;

  if (!hasAmount && !hasProof) return null;

  const amountError = validatePreviousQuoteAmount(amountRaw);
  if (amountError) return amountError;

  if (!hasAmount) {
    return "Indiquez le montant du devis précédent.";
  }
  return validateProofFile(proofFile);
}
