import type { TradeCategory } from "./data";
import type { ProRegistration, ProTradeSelection } from "./store-types";
import { getTradeGuaranteeType } from "./trade-guarantees";

/** Champs métier utiles — sans exiger passwordHash (vues admin sécurisées). */
export type ProTradeSource = Pick<
  ProRegistration,
  | "category"
  | "tradeSelections"
  | "tradeGroupId"
  | "tradeGroupLabel"
  | "qualibatJobId"
  | "qualibatJobLabel"
>;

/** Sélections métier d'un pro (plusieurs corps de métier possibles). */
export function getProTradeSelections(pro: ProTradeSource): ProTradeSelection[] {
  const raw: ProTradeSelection[] = (() => {
    if (pro.tradeSelections?.length) {
      return pro.tradeSelections;
    }
    if (
      pro.tradeGroupId &&
      pro.qualibatJobId != null &&
      pro.tradeGroupLabel &&
      pro.qualibatJobLabel
    ) {
      return [
        {
          tradeGroupId: pro.tradeGroupId,
          tradeGroupLabel: pro.tradeGroupLabel,
          qualibatJobId: pro.qualibatJobId,
          qualibatJobLabel: pro.qualibatJobLabel,
          category: pro.category,
        },
      ];
    }
    return [];
  })();

  return raw.map((s) => ({
    ...s,
    guaranteeType: s.guaranteeType ?? getTradeGuaranteeType(s.tradeGroupId),
  }));
}

export function formatProTradeSelections(pro: ProTradeSource): string {
  const selections = getProTradeSelections(pro);
  if (selections.length === 0) {
    return "—";
  }
  return selections
    .map((s) => `${s.tradeGroupLabel} · ${s.qualibatJobLabel}`)
    .join(" ; ");
}

export function proCoversTradeCategory(
  pro: ProTradeSource,
  workCategoryLabel: string
): boolean {
  const label = workCategoryLabel.toLowerCase();
  const selections = getProTradeSelections(pro);
  const categories =
    selections.length > 0
      ? selections.map((s) => s.category)
      : [pro.category];

  const map: Record<string, string[]> = {
    peinture: ["peinture"],
    plomberie: ["plomberie"],
    électricité: ["electricite", "électricité"],
    electricite: ["électricité", "electricite"],
    maçonnerie: ["maçonnerie", "maconnerie"],
    maconnerie: ["maçonnerie", "maconnerie"],
    isolation: ["isolation", "chauffage"],
    chauffage: ["chauffage", "isolation"],
    menuiserie: ["menuiserie"],
    carrelage: ["carrelage"],
    plaquiste: ["plaquiste", "placo"],
    couverture: ["couverture", "charpente"],
    charpente: ["charpente", "couverture"],
  };

  for (const cat of categories) {
    const p = cat.toLowerCase();
    if (label.includes(p) || p.includes(label.slice(0, 4))) return true;
    for (const [key, aliases] of Object.entries(map)) {
      if (label.includes(key) && aliases.some((a) => p.includes(a.replace("é", "e")))) {
        return true;
      }
    }
  }
  return false;
}

export function primaryTradeCategory(selections: ProTradeSelection[]): TradeCategory {
  return selections[0]?.category ?? "peinture";
}
