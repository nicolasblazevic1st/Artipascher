/**
 * Contrôle BODACC (procédures collectives) — API DILA / OpenDataSoft, gratuite.
 * Licence Ouverte 2.0 — https://www.data.gouv.fr/dataservices/api-bulletin-officiel-des-annonces-civiles-et-commerciales-bodacc
 *
 * Dataset : annonces-commerciales
 * Endpoint : bodacc-datadila.opendatasoft.com (API Explore v2.1)
 */

export type BodaccCheckStatus = "clear" | "active_procedure" | "unavailable";

export interface BodaccAnnouncementSummary {
  id: string;
  dateParution?: string;
  nature?: string;
  commercant?: string;
  tribunal?: string;
  url?: string;
}

export interface BodaccProcedureCheck {
  status: BodaccCheckStatus;
  checkedAt: string;
  siren: string;
  /** true si une procédure collective semble encore en cours. */
  hasActiveProcedure: boolean;
  latestBlocking?: BodaccAnnouncementSummary;
  latestClosing?: BodaccAnnouncementSummary;
  /** Nombre d'annonces « collective » examinées. */
  examinedCount: number;
  error?: string;
}

const BODACC_RECORDS_URL =
  "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records";

const BODACC_EXPLORE_TABLE_URL =
  "https://bodacc-datadila.opendatasoft.com/explore/dataset/annonces-commerciales/table/";

const BODACC_ANNOUNCEMENT_DETAIL_URL =
  "https://www.bodacc.fr/pages/annonces-commerciales-detail/";

/** Lien public : toutes les annonces collectives pour un SIREN (consultation admin). */
export function bodaccCollectiveSearchUrl(sirenInput: string): string {
  const siren = normalizeSiren(sirenInput);
  const url = new URL(BODACC_EXPLORE_TABLE_URL);
  if (siren) url.searchParams.set("q", siren);
  url.searchParams.set("refine.familleavis", "collective");
  return url.toString();
}

/** Lien vers une annonce précise (snapshot stocké ou id BODACC). */
export function bodaccAnnouncementUrl(params: {
  url?: string;
  announcementId?: string;
}): string | null {
  if (params.url) return params.url;
  if (params.announcementId) {
    return `${BODACC_ANNOUNCEMENT_DETAIL_URL}?q.id=id:${params.announcementId}`;
  }
  return null;
}

/** Natures qui signalent une difficulté / procédure ouverte. */
const BLOCKING_NATURE =
  /ouverture|liquidation\s+judiciaire|redressement\s+judiciaire|sauvegarde|conversion\s+en\s+liquidation|r[eé]solution\s+du\s+plan|plan\s+de\s+cession|cessation\s+des\s+paiements|d[eé]p[oô]t\s+de\s+l['’]?\s*[eé]tat\s+des\s+cr[eé]ances/i;

/** Clôture / fin de procédure (annule un blocage plus ancien). */
const CLOSING_NATURE = /cl[oô]ture/i;

interface BodaccRecord {
  id?: string;
  dateparution?: string;
  commercant?: string;
  tribunal?: string;
  url_complete?: string;
  jugement?: string | Record<string, unknown> | null;
  registre?: string | string[] | null;
  familleavis?: string;
}

interface BodaccApiResponse {
  total_count?: number;
  results?: BodaccRecord[];
}

function normalizeSiren(input: string): string {
  return input.replace(/\D/g, "").slice(0, 9);
}

function parseJugement(raw: BodaccRecord["jugement"]): {
  nature?: string;
  date?: string;
  famille?: string;
} {
  if (!raw) return {};
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return {};
    const j = obj as Record<string, unknown>;
    return {
      nature: typeof j.nature === "string" ? j.nature : undefined,
      date: typeof j.date === "string" ? j.date : undefined,
      famille: typeof j.famille === "string" ? j.famille : undefined,
    };
  } catch {
    return {};
  }
}

function toSummary(record: BodaccRecord): BodaccAnnouncementSummary {
  const jugement = parseJugement(record.jugement);
  return {
    id: record.id ?? "",
    dateParution: record.dateparution ?? jugement.date,
    nature: jugement.nature,
    commercant: record.commercant,
    tribunal: record.tribunal,
    url: record.url_complete,
  };
}

function eventDate(summary: BodaccAnnouncementSummary): string {
  return summary.dateParution ?? "";
}

/**
 * Analyse les annonces BODACC « collective » pour un SIREN.
 * Heuristique : le dernier signal bloquant plus récent qu'une clôture ⇒ procédure active.
 */
export function analyzeBodaccCollectiveRecords(
  records: BodaccRecord[]
): Pick<
  BodaccProcedureCheck,
  "hasActiveProcedure" | "latestBlocking" | "latestClosing" | "examinedCount"
> {
  let latestBlocking: BodaccAnnouncementSummary | undefined;
  let latestClosing: BodaccAnnouncementSummary | undefined;

  for (const record of records) {
    const summary = toSummary(record);
    const nature = summary.nature ?? "";
    if (!nature) continue;

    if (CLOSING_NATURE.test(nature)) {
      if (!latestClosing || eventDate(summary) > eventDate(latestClosing)) {
        latestClosing = summary;
      }
      continue;
    }

    if (BLOCKING_NATURE.test(nature)) {
      if (!latestBlocking || eventDate(summary) > eventDate(latestBlocking)) {
        latestBlocking = summary;
      }
    }
  }

  const hasActiveProcedure = Boolean(
    latestBlocking &&
      (!latestClosing || eventDate(latestBlocking) > eventDate(latestClosing))
  );

  return {
    hasActiveProcedure,
    latestBlocking,
    latestClosing,
    examinedCount: records.length,
  };
}

/** Interroge l'API BODACC pour les procédures collectives d'un SIREN. */
export async function checkBodaccCollectiveProcedures(
  sirenInput: string
): Promise<BodaccProcedureCheck> {
  const siren = normalizeSiren(sirenInput);
  const checkedAt = new Date().toISOString();

  if (!/^\d{9}$/.test(siren)) {
    return {
      status: "unavailable",
      checkedAt,
      siren: sirenInput,
      hasActiveProcedure: false,
      examinedCount: 0,
      error: "SIREN invalide pour contrôle BODACC.",
    };
  }

  const where = `registre like "${siren}" and familleavis="collective"`;
  const url = new URL(BODACC_RECORDS_URL);
  url.searchParams.set("where", where);
  url.searchParams.set("order_by", "dateparution desc");
  url.searchParams.set("limit", "30");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        checkedAt,
        siren,
        hasActiveProcedure: false,
        examinedCount: 0,
        error: `BODACC HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as BodaccApiResponse;
    const results = data.results ?? [];
    const analysis = analyzeBodaccCollectiveRecords(results);

    return {
      status: analysis.hasActiveProcedure ? "active_procedure" : "clear",
      checkedAt,
      siren,
      ...analysis,
    };
  } catch (err) {
    return {
      status: "unavailable",
      checkedAt,
      siren,
      hasActiveProcedure: false,
      examinedCount: 0,
      error: err instanceof Error ? err.message : "Erreur BODACC",
    };
  }
}
