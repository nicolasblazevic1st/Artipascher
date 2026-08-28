import type { WorkRequest } from "./store-types";

export const ALLOWED_DEPARTMENTS = ["59", "62"] as const;

export type ClientDepartment = (typeof ALLOWED_DEPARTMENTS)[number];

export function departmentFromPostalCode(postalCode: string): ClientDepartment | null {
  const dept = postalCode.slice(0, 2);
  if (dept === "59" || dept === "62") return dept;
  return null;
}

export function validateAddressLine(value: unknown): string | null {
  if (typeof value !== "string") return "L'adresse du chantier est obligatoire.";
  const trimmed = value.trim();
  if (trimmed.length < 5) {
    return "Indiquez le numéro et le nom de la voie (ex. 12 rue de la Barre).";
  }
  if (trimmed.length > 200) {
    return "L'adresse est trop longue.";
  }
  return null;
}

export function validateAddressLine2(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  if (value.trim().length > 120) {
    return "Le complément d'adresse est trop long.";
  }
  return null;
}

export function validatePostalCode(value: unknown): string | null {
  if (typeof value !== "string") return "Le code postal est obligatoire.";
  const trimmed = value.trim();
  if (!/^(59|62)\d{3}$/.test(trimmed)) {
    return "Code postal invalide — uniquement Nord (59) ou Pas-de-Calais (62).";
  }
  return null;
}

export function validateCity(value: unknown): string | null {
  if (typeof value !== "string") return "La ville est obligatoire.";
  const trimmed = value.trim();
  if (trimmed.length < 2) return "Indiquez la ville du chantier.";
  if (trimmed.length > 80) return "Le nom de ville est trop long.";
  return null;
}

export function validateClientAddress(fields: {
  addressLine: unknown;
  addressLine2?: unknown;
  postalCode: unknown;
  city: unknown;
}): string | null {
  return (
    validateAddressLine(fields.addressLine) ??
    validateAddressLine2(fields.addressLine2) ??
    validatePostalCode(fields.postalCode) ??
    validateCity(fields.city)
  );
}

/** Formulaire public : commune BAN seulement (pas de rue). */
export function validateClientCityLocation(fields: {
  postalCode: unknown;
  city: unknown;
}): string | null {
  return validatePostalCode(fields.postalCode) ?? validateCity(fields.city);
}

export function isCityOnlyAddress(request: AddressFields): boolean {
  const line = (request.addressLine ?? "").trim();
  if (!line) return true;
  return (
    line.localeCompare(request.city.trim(), "fr", { sensitivity: "accent" }) ===
    0
  );
}

type AddressFields = Pick<
  WorkRequest,
  "addressLine" | "addressLine2" | "postalCode" | "city" | "department"
>;

/** Adresse complète pour admin et coordonnées pro débloquées. */
export function formatWorkRequestAddress(request: AddressFields): string {
  if (isCityOnlyAddress(request)) {
    return request.postalCode
      ? `${request.postalCode} ${request.city}`
      : `${request.city} (${request.department})`;
  }
  if (request.addressLine && request.postalCode) {
    const lines = [request.addressLine];
    if (request.addressLine2?.trim()) lines.push(request.addressLine2.trim());
    lines.push(`${request.postalCode} ${request.city}`);
    return lines.join(", ");
  }
  return `${request.city} (${request.department})`;
}

/** Une ligne rue + complément (sans CP/ville). */
export function formatStreetAddress(request: AddressFields): string {
  if (isCityOnlyAddress(request) || !request.addressLine) return request.city;
  return request.addressLine2?.trim()
    ? `${request.addressLine}, ${request.addressLine2.trim()}`
    : request.addressLine;
}

/** Code postal + ville pour les fiches contact. */
export function formatPostalCity(request: AddressFields): string {
  if (request.postalCode) {
    return `${request.postalCode} ${request.city}`;
  }
  return `${request.city} (${request.department})`;
}

/** Localisation publique (sans adresse exacte). */
export function formatPublicLocation(request: AddressFields): string {
  if (request.postalCode) {
    return `${request.city} (${request.postalCode})`;
  }
  return `${request.city} (${request.department})`;
}

export function workRequestToClientContactAddress(request: AddressFields) {
  return {
    address: formatStreetAddress(request),
    postalCode: formatPostalCity(request),
  };
}
