import type { ClientKind, WorkScope } from "./store-types";

export const CLIENT_KIND_LABELS: Record<ClientKind, string> = {
  individual: "Particulier",
  company: "Entreprise",
  copropriete: "Copropriété",
};

export const WORK_SCOPE_LABELS: Record<WorkScope, string> = {
  commun: "Parties communes",
  privatif: "Lot privatif",
};

export function parseClientKind(value: unknown): ClientKind {
  const raw = String(value ?? "").trim();
  if (raw === "company") return "company";
  if (raw === "copropriete") return "copropriete";
  return "individual";
}

export function parseWorkScope(value: unknown): WorkScope | undefined {
  const raw = String(value ?? "").trim();
  if (raw === "commun" || raw === "privatif") return raw;
  return undefined;
}

export function isCoproprieteKind(
  kind: ClientKind | string | undefined | null
): boolean {
  return kind === "copropriete";
}
