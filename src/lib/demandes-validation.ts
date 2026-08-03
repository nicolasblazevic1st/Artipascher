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
    if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
      return "Format non accepté. Utilisez JPG, PNG ou WebP.";
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return `Chaque photo doit faire moins de ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024} Mo.`;
    }
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
