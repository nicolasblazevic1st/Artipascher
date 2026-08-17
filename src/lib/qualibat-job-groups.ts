import type { TradeCategory } from "./data";
import { QUALIBAT_JOBS, type QualibatJob } from "./qualibat-jobs";
import { defaultDecennaleStatus } from "./decennale-verification";
import type { ProTradeSelection } from "./store-types";

export interface TradeGroup {
  id: string;
  label: string;
  /** Catégorie interne Nord Artisan Pro (enchères, matching). */
  category: TradeCategory;
}

export const TRADE_GROUPS: TradeGroup[] = [
  { id: "maconnerie", label: "Maçonnerie & gros œuvre", category: "maconnerie" },
  { id: "charpente-couverture", label: "Charpente & couverture", category: "charpente" },
  { id: "plomberie-chauffage", label: "Plomberie & chauffage", category: "plomberie" },
  { id: "electricite", label: "Électricité & automatismes", category: "electricite" },
  { id: "menuiserie", label: "Menuiserie & métallerie", category: "menuiserie" },
  { id: "peinture", label: "Peinture & décoration", category: "peinture" },
  { id: "platrerie", label: "Plâtrerie & placo", category: "plaquiste" },
  { id: "carrelage", label: "Carrelage & sols", category: "carrelage" },
  { id: "isolation-energie", label: "Isolation & rénovation énergétique", category: "chauffage" },
  { id: "facade-etancheite", label: "Façade & étanchéité", category: "maconnerie" },
  { id: "amenagement", label: "Aménagement & agencement", category: "menuiserie" },
  { id: "terrassement-vrd", label: "Terrassement & VRD", category: "maconnerie" },
  { id: "autres", label: "Autres métiers", category: "peinture" },
];

const GROUP_BY_ID = Object.fromEntries(TRADE_GROUPS.map((g) => [g.id, g])) as Record<
  string,
  TradeGroup
>;

/** Règles par ordre de priorité (première correspondance gagne). */
const CLASSIFICATION_RULES: Array<{ groupId: string; pattern: RegExp }> = [
  {
    groupId: "isolation-energie",
    pattern:
      /isolat|ité\b|ite\b|photovolta|solaire|énergét|energet|audit|pac\b|rénovateur|rge|eco artisan|performance énergétique|pros de la performance|bardage bois|calorifuge/i,
  },
  {
    groupId: "plomberie-chauffage",
    pattern:
      /plomb|chauff|climat|frigor|fumiste|ramoneur|poêl|canalisateur|vmc|ventilation|thermicien|réseau de chauffage|fluides spéciaux|évacuation de fumée|arrosage/i,
  },
  {
    groupId: "electricite",
    pattern: /électri|electric|automaticien|gtc|gestion technique|gestionnaire|maintenancier/i,
  },
  {
    groupId: "charpente-couverture",
    pattern: /charpent|couvreur|cureur|bardeur|ossature bois|lamell|constructeur.*bois|constructeur en béton armé/i,
  },
  {
    groupId: "facade-etancheite",
    pattern: /façad|facad|étanch|etanch|ravaleur|applicateur/i,
  },
  {
    groupId: "platrerie",
    pattern: /plaquiste|plâtrier|platrier|gypsier|cloisonneur|staffeur|stucateur|accoustique|acoustique|incendie/i,
  },
  {
    groupId: "carrelage",
    pattern: /carrel|mosaï|mosai|parquet|moquette|solier|marbrier|paveur|dallag|dalleur|chapiste/i,
  },
  {
    groupId: "peinture",
    pattern: /peintre|enduiseur|décorateur|decorateur|finition|tailleur de pierres|restaurateur|patrimoine|ornementiste|sculpteur/i,
  },
  {
    groupId: "menuiserie",
    pattern:
      /menuisier|fenestrier|vérandal|verandal|ferronnier|serrurier|métallier|metallier|fermeture|storiste|protection solaire|vitrier|miroitier|chaudronnier|tolier|monteur-levageur|monteur d'étai|â?trier/i,
  },
  {
    groupId: "amenagement",
    pattern:
      /agenceur|combles|cuisine|salles? de bains?|paysag|piscin|enseign|lamelliste|mesureur|opérateur de mesures|projeteur/i,
  },
  {
    groupId: "terrassement-vrd",
    pattern: /terras|démolis|demolis|déconstruct|deconstruct|désamiant|desamiant|échafaud|echafaud|cordiste|foreur|fondations spéciales/i,
  },
  {
    groupId: "maconnerie",
    pattern: /maçon|macon|constructeur|béton|beton/i,
  },
];

export function classifyQualibatJob(job: QualibatJob): string {
  const label = job.label.normalize("NFD").replace(/\p{M}/gu, "");
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(label) || rule.pattern.test(job.label)) {
      return rule.groupId;
    }
  }
  return "autres";
}

export interface GroupedQualibatJobs {
  group: TradeGroup;
  jobs: QualibatJob[];
}

function buildGroupedJobs(): GroupedQualibatJobs[] {
  const buckets = new Map<string, QualibatJob[]>();
  for (const group of TRADE_GROUPS) {
    buckets.set(group.id, []);
  }

  for (const job of QUALIBAT_JOBS) {
    const groupId = classifyQualibatJob(job);
    buckets.get(groupId)?.push(job);
  }

  return TRADE_GROUPS.map((group) => ({
    group,
    jobs: (buckets.get(group.id) ?? []).sort((a, b) =>
      a.label.localeCompare(b.label, "fr")
    ),
  })).filter((entry) => entry.jobs.length > 0);
}

export const GROUPED_QUALIBAT_JOBS: GroupedQualibatJobs[] = buildGroupedJobs();

export function getTradeGroup(groupId: string): TradeGroup | undefined {
  return GROUP_BY_ID[groupId];
}

export function getJobsForTradeGroup(groupId: string): QualibatJob[] {
  return GROUPED_QUALIBAT_JOBS.find((entry) => entry.group.id === groupId)?.jobs ?? [];
}

export function findQualibatJob(jobId: number): QualibatJob | undefined {
  return QUALIBAT_JOBS.find((job) => job.id === jobId);
}

export function resolveTradeSelection(groupId: string, jobId: number) {
  const group = getTradeGroup(groupId);
  const job = findQualibatJob(jobId);
  if (!group || !job) return null;
  const expectedGroup = classifyQualibatJob(job);
  if (expectedGroup !== groupId) return null;
  return { group, job, category: group.category };
}

export function resolveMultipleTradeSelections(
  entries: Array<{ tradeGroupId: string; qualibatJobId: number }>
): ProTradeSelection[] | null {
  if (entries.length === 0) return null;

  const seenGroups = new Set<string>();
  const selections: ProTradeSelection[] = [];

  for (const entry of entries) {
    if (seenGroups.has(entry.tradeGroupId)) return null;
    seenGroups.add(entry.tradeGroupId);

    const resolved = resolveTradeSelection(entry.tradeGroupId, entry.qualibatJobId);
    if (!resolved) return null;

    selections.push({
      tradeGroupId: resolved.group.id,
      tradeGroupLabel: resolved.group.label,
      qualibatJobId: resolved.job.id,
      qualibatJobLabel: resolved.job.label,
      category: resolved.category,
      decennaleStatus: defaultDecennaleStatus(),
    });
  }

  return selections;
}
