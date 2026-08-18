/** Validation SIRET / registre du commerce (RCS via INSEE). */

import {
  buildRcsRegisteredActivities,
  type RcsRegisteredActivity,
} from "./naf-trade-groups";
import type { LegalRepresentative } from "./store-types";

export interface RcsVerificationResult {
  valid: boolean;
  siret: string;
  siren: string;
  companyName?: string;
  city?: string;
  department?: string;
  isActive?: boolean;
  /** Activités NAF déclarées au registre (établissement vérifié). */
  registeredActivities?: RcsRegisteredActivity[];
  /** Dirigeants / représentants légaux (API recherche-entreprises). */
  legalRepresentatives?: LegalRepresentative[];
  error?: string;
}

export function normalizeSiret(input: string): string {
  return input.replace(/\s/g, "");
}

export function isValidSiretFormat(siret: string): boolean {
  const normalized = normalizeSiret(siret);
  if (!/^\d{14}$/.test(normalized)) return false;
  return luhnCheck(normalized);
}

export function extractSiren(siret: string): string {
  return normalizeSiret(siret).slice(0, 9);
}

function luhnCheck(value: string): boolean {
  let sum = 0;
  for (let i = 0; i < value.length; i++) {
    let digit = parseInt(value[value.length - 1 - i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const ALLOWED_DEPARTMENTS = ["59", "62"] as const;

export function isAllowedDepartment(code: string | undefined): boolean {
  if (!code) return false;
  return (ALLOWED_DEPARTMENTS as readonly string[]).includes(code);
}

interface GouvDirigeant {
  nom?: string | null;
  prenoms?: string | null;
  qualite?: string | null;
  type_dirigeant?: string | null;
  denomination?: string | null;
  siren?: string | null;
}

export interface GouvEntrepriseResult {
  results?: Array<{
    nom_complet?: string;
    etat_administratif?: string;
    activite_principale?: string;
    dirigeants?: GouvDirigeant[];
    siege?: {
      libelle_commune?: string;
      code_postal?: string;
      activite_principale?: string;
    };
    matching_etablissements?: Array<{
      siret?: string;
      etat_administratif?: string;
      activite_principale?: string;
    }>;
  }>;
}

export function mapGouvDirigeants(
  dirigeants: GouvDirigeant[] | undefined
): LegalRepresentative[] {
  if (!dirigeants?.length) return [];

  const mapped: LegalRepresentative[] = [];
  for (const d of dirigeants) {
    const isMoral =
      d.type_dirigeant === "personne morale" ||
      d.type_dirigeant === "personne_morale" ||
      Boolean(d.denomination && !d.nom);

    const fullName = isMoral
      ? (d.denomination ?? "").trim()
      : [d.prenoms, d.nom]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

    if (!fullName) continue;

    mapped.push({
      fullName,
      role: d.qualite?.trim() || undefined,
      kind: isMoral ? "personne_morale" : "personne_physique",
    });
  }

  // Dédupliquer par nom normalisé
  const seen = new Set<string>();
  return mapped.filter((rep) => {
    const key = rep.fullName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectRegisteredNafCodes(
  company: NonNullable<GouvEntrepriseResult["results"]>[number],
  siret: string
): string[] {
  const codes: string[] = [];
  const matching = company.matching_etablissements?.find((e) => e.siret === siret);

  if (matching?.activite_principale) {
    codes.push(matching.activite_principale);
  } else if (company.siege?.activite_principale) {
    codes.push(company.siege.activite_principale);
  }

  if (company.activite_principale) {
    codes.push(company.activite_principale);
  }

  return codes;
}

export async function verifyWithRegistry(
  siret: string
): Promise<RcsVerificationResult> {
  const normalized = normalizeSiret(siret);

  if (!isValidSiretFormat(normalized)) {
    return {
      valid: false,
      siret: normalized,
      siren: extractSiren(normalized),
      error: "Numéro SIRET invalide (14 chiffres requis).",
    };
  }

  try {
    const response = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${normalized}&page=1&per_page=1`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return {
        valid: false,
        siret: normalized,
        siren: extractSiren(normalized),
        error: "Impossible de consulter le registre du commerce. Réessayez plus tard.",
      };
    }

    const data = (await response.json()) as GouvEntrepriseResult;
    const company = data.results?.[0];

    if (!company) {
      return {
        valid: false,
        siret: normalized,
        siren: extractSiren(normalized),
        error: "Entreprise introuvable au registre du commerce (RCS).",
      };
    }

    const isActive = company.etat_administratif === "A";
    const matchingEstablishment = company.matching_etablissements?.find(
      (e) => e.siret === normalized
    );
    const establishmentActive =
      !matchingEstablishment ||
      matchingEstablishment.etat_administratif === "A";

    const postalCode = company.siege?.code_postal ?? "";
    const department = postalCode.slice(0, 2);

    if (!isActive || !establishmentActive) {
      return {
        valid: false,
        siret: normalized,
        siren: extractSiren(normalized),
        companyName: company.nom_complet,
        error: "Cette entreprise n'est plus active au registre du commerce.",
      };
    }

    const registeredActivities = buildRcsRegisteredActivities(
      collectRegisteredNafCodes(company, normalized)
    );
    const legalRepresentatives = mapGouvDirigeants(company.dirigeants);

    return {
      valid: true,
      siret: normalized,
      siren: extractSiren(normalized),
      companyName: company.nom_complet,
      city: company.siege?.libelle_commune,
      department,
      isActive: true,
      registeredActivities,
      legalRepresentatives,
    };
  } catch {
    return {
      valid: false,
      siret: normalized,
      siren: extractSiren(normalized),
      error: "Erreur de connexion au registre du commerce.",
    };
  }
}
