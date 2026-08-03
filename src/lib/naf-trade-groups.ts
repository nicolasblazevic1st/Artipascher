import { getJobsForTradeGroup } from "./qualibat-job-groups";

/** Libellés NAF rév. 2 (section F — construction & services associés). */
export const NAF_LABELS: Record<string, string> = {
  "41.20A": "Construction de maisons individuelles",
  "43.11Z": "Travaux de démolition",
  "43.12A": "Travaux de terrassement courants",
  "43.12B": "Travaux de terrassement spécialisés ou de grande masse",
  "43.21A": "Travaux d'installation électrique",
  "43.22A": "Travaux d'installation d'eau et de gaz",
  "43.22B": "Travaux d'installation d'équipements thermiques et de climatisation",
  "43.29A": "Travaux d'isolation",
  "43.29B": "Travaux de menuiserie et de fermeture",
  "43.31Z": "Travaux de plâtrerie",
  "43.32A": "Travaux de menuiserie bois et PVC",
  "43.32B": "Travaux de menuiserie métallique et serrurerie",
  "43.33Z": "Travaux de revêtement des sols et des murs",
  "43.34Z": "Travaux de peinture et vitrerie",
  "43.91A": "Travaux de charpente",
  "43.91B": "Travaux de couverture",
  "43.99C": "Travaux de maçonnerie générale et gros œuvre",
  "25.11Z": "Fabrication de structures métalliques et de parties de structures",
  "81.21Z": "Nettoyage courant des bâtiments",
  "81.22Z": "Autres activités de nettoyage des bâtiments",
  "81.29B": "Autres activités de nettoyage",
  "81.30Z": "Services d'aménagement paysager",
};

/** Codes NAF → corps de métier Qualibat (plusieurs groupes possibles). */
const NAF_TO_TRADE_GROUP_IDS: Record<string, string[]> = {
  "41.20A": ["maconnerie", "amenagement"],
  "43.11Z": ["terrassement-vrd", "maconnerie"],
  "43.12A": ["terrassement-vrd"],
  "43.12B": ["terrassement-vrd"],
  "43.21A": ["electricite", "isolation-energie"],
  "43.22A": ["plomberie-chauffage"],
  "43.22B": ["plomberie-chauffage", "isolation-energie"],
  "43.29A": ["isolation-energie"],
  "43.29B": ["isolation-energie", "menuiserie"],
  "43.31Z": ["platrerie"],
  "43.32A": ["menuiserie"],
  "43.32B": ["menuiserie"],
  "43.33Z": ["carrelage"],
  "43.34Z": ["peinture"],
  "43.91A": ["charpente-couverture"],
  "43.91B": ["charpente-couverture"],
  "43.99C": ["maconnerie", "facade-etancheite", "terrassement-vrd"],
  "25.11Z": ["menuiserie"],
  "81.21Z": ["autres"],
  "81.22Z": ["autres"],
  "81.29B": ["autres"],
  "81.30Z": ["amenagement"],
};

const NAF_JOB_HINTS: Record<string, RegExp> = {
  "43.22A": /plomb/i,
  "43.22B": /chauffag|gaz|pac|pompe|climat|fumiste|thermicien/i,
  "43.21A": /électri|electric/i,
  "43.29A": /isol/i,
  "43.34Z": /peintre/i,
  "43.33Z": /carrel|solier|parquet/i,
  "43.31Z": /plaquiste|plâtrier|platrier/i,
  "43.32A": /menuisier.*bois|fenestrier|vérandal|verandal/i,
  "43.32B": /serrur|métallier|metallier|ferronnier/i,
  "43.91A": /charpent/i,
  "43.91B": /couvreur|cureur/i,
  "43.99C": /maçon|macon|constructeur/i,
  "43.12A": /terras/i,
  "43.12B": /terras|démolis|demolis/i,
  "81.30Z": /paysag/i,
};

export interface RcsRegisteredActivity {
  nafCode: string;
  label: string;
  suggestedTradeGroupIds: string[];
}

export function normalizeNafCode(code: string): string {
  return code.trim().toUpperCase();
}

export function getNafLabel(nafCode: string): string {
  const normalized = normalizeNafCode(nafCode);
  return NAF_LABELS[normalized] ?? `Activité NAF ${normalized}`;
}

export function getTradeGroupIdsForNaf(nafCode: string): string[] {
  const normalized = normalizeNafCode(nafCode);
  const exact = NAF_TO_TRADE_GROUP_IDS[normalized];
  if (exact?.length) return [...exact];

  const prefix = normalized.slice(0, 4);
  if (prefix === "43.2") return ["plomberie-chauffage", "electricite"];
  if (prefix === "43.3") return ["peinture", "carrelage", "platrerie"];
  if (prefix === "43.9") return ["charpente-couverture", "maconnerie"];
  if (prefix.startsWith("43")) return ["maconnerie"];
  if (prefix.startsWith("81")) return ["autres"];

  return [];
}

export function buildRcsRegisteredActivities(nafCodes: string[]): RcsRegisteredActivity[] {
  const seen = new Set<string>();
  const activities: RcsRegisteredActivity[] = [];

  for (const raw of nafCodes) {
    const nafCode = normalizeNafCode(raw);
    if (!nafCode || seen.has(nafCode)) continue;
    seen.add(nafCode);

    const suggestedTradeGroupIds = getTradeGroupIdsForNaf(nafCode);
    if (suggestedTradeGroupIds.length === 0) continue;

    activities.push({
      nafCode,
      label: getNafLabel(nafCode),
      suggestedTradeGroupIds,
    });
  }

  return activities;
}

export function suggestQualibatJobIdForNaf(
  nafCode: string,
  groupId: string
): number | undefined {
  const jobs = getJobsForTradeGroup(groupId);
  if (jobs.length === 0) return undefined;

  const normalized = normalizeNafCode(nafCode);
  const hint = NAF_JOB_HINTS[normalized];
  if (hint) {
    const match = jobs.find((job) => hint.test(job.label));
    if (match) return match.id;
  }

  return undefined;
}

export function applyRcsActivitiesToTradeSelection(
  activities: RcsRegisteredActivity[]
): {
  selectedGroups: Record<string, boolean>;
  jobByGroup: Record<string, string>;
  rcsGroupIds: Set<string>;
} {
  const selectedGroups: Record<string, boolean> = {};
  const jobByGroup: Record<string, string> = {};
  const rcsGroupIds = new Set<string>();

  for (const activity of activities) {
    for (const groupId of activity.suggestedTradeGroupIds) {
      selectedGroups[groupId] = true;
      rcsGroupIds.add(groupId);

      if (!jobByGroup[groupId]) {
        const suggestedJobId = suggestQualibatJobIdForNaf(activity.nafCode, groupId);
        if (suggestedJobId != null) {
          jobByGroup[groupId] = String(suggestedJobId);
        }
      }
    }
  }

  return { selectedGroups, jobByGroup, rcsGroupIds };
}
