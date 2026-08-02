export const MIN_DESCRIPTION_LENGTH = 100;
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
export const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
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
