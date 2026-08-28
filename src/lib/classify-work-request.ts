import { getNafCodesForCategory, listPlatformCategoryNafCodes } from "./naf-codes";
import { normalizeNafCode } from "./naf-trade-groups";
import {
  DEFAULT_PRICING_TIER,
  getWorkOptionById,
  getWorkOptionsForNafCodes,
  isPricingTierId,
  matchWorkOptionFromDescription,
  unlockPriceEurForTier,
  type NafWorkOption,
  type PricingTierId,
} from "./pricing-tiers";
import {
  GENERAL_WORK_CATEGORY,
  isWorkCategory,
  matchCategoryFromSearchText,
  WORK_CATEGORIES,
  type WorkCategory,
} from "./work-categories";

export type WorkClassification = {
  category: WorkCategory;
  nafCodes: string[];
  source: "keywords" | "ads" | "llm" | "fallback";
  tradeLabel?: string;
  workOptionId?: string;
  pricingTier: PricingTierId;
  pricingSource: "keywords" | "llm" | "fallback";
};

function categoriesForNaf(nafCode: string): WorkCategory[] {
  const naf = normalizeNafCode(nafCode);
  return WORK_CATEGORIES.filter((category) =>
    getNafCodesForCategory(category).includes(naf)
  );
}

function attachOption(
  category: WorkCategory,
  source: WorkClassification["source"],
  option?: NafWorkOption,
  pricingTier?: PricingTierId,
  pricingSource?: WorkClassification["pricingSource"],
  tradeLabel?: string
): WorkClassification {
  const categoryNafs = getNafCodesForCategory(category);
  const validOption =
    option && categoryNafs.includes(normalizeNafCode(option.nafCode))
      ? option
      : undefined;
  const tier: PricingTierId =
    validOption?.tier ??
    (pricingTier && isPricingTierId(pricingTier)
      ? pricingTier
      : DEFAULT_PRICING_TIER);
  return {
    category,
    nafCodes: validOption
      ? [normalizeNafCode(validOption.nafCode)]
      : categoryNafs,
    source,
    tradeLabel,
    workOptionId: validOption?.id,
    pricingTier: tier,
    pricingSource: validOption
      ? (pricingSource ?? "keywords")
      : pricingTier
        ? (pricingSource ?? "llm")
        : "fallback",
  };
}

function optionFromKeywords(
  description: string,
  category: WorkCategory
): NafWorkOption | undefined {
  return matchWorkOptionFromDescription(
    description,
    getNafCodesForCategory(category)
  );
}

/**
 * Déduit métier, prestation catalogue et ticket artisan (10–20 €).
 * Mots-clés d’abord, OpenAI si OPENAI_API_KEY, sinon ticket élevé.
 */
export async function classifyWorkFromDescription(
  description: string,
  adsHint?: string | null
): Promise<WorkClassification> {
  const fromText = matchCategoryFromSearchText(description);
  if (fromText) {
    const keyed = optionFromKeywords(description, fromText);
    if (keyed) return attachOption(fromText, "keywords", keyed, undefined, "keywords");
    const llm = await classifyPricingWithLlm(description, fromText);
    if (llm) return llm;
    return attachOption(fromText, "keywords");
  }

  const fromAnyOption = matchWorkOptionFromDescription(
    description,
    listPlatformCategoryNafCodes()
  );
  if (fromAnyOption) {
    const cats = categoriesForNaf(fromAnyOption.nafCode);
    if (cats.length === 1) {
      return attachOption(cats[0], "keywords", fromAnyOption, undefined, "keywords");
    }
  }

  const llm = await classifyPricingWithLlm(description);
  if (llm) return llm;

  const fromAds = matchCategoryFromSearchText(adsHint);
  if (fromAds) {
    const keyed =
      optionFromKeywords(description, fromAds) ??
      (adsHint ? optionFromKeywords(adsHint, fromAds) : undefined);
    return attachOption(
      fromAds,
      "ads",
      keyed,
      undefined,
      keyed ? "keywords" : "fallback"
    );
  }

  return attachOption(GENERAL_WORK_CATEGORY, "fallback");
}

function catalogForPrompt(nafCodes: string[]): string {
  return getWorkOptionsForNafCodes(nafCodes)
    .map((opt) => {
      const price = unlockPriceEurForTier(opt.tier);
      return `${opt.id} | ${opt.name} | ${opt.detail} | ticket ${opt.tier} ${price}€`;
    })
    .join("\n");
}

async function classifyPricingWithLlm(
  description: string,
  knownCategory?: WorkCategory
): Promise<WorkClassification | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const category = knownCategory;
  const nafCodes = category
    ? getNafCodesForCategory(category)
    : listPlatformCategoryNafCodes();
  const catalog = catalogForPrompt(nafCodes);
  if (!catalog) {
    return category ? attachOption(category, "llm") : null;
  }

  const categoriesList = WORK_CATEGORIES.join(", ");
  const system = category
    ? `Tu estimes le ticket artisan (prix de déblocage 10 / 12,5 / 15 / 20 €) d’une demande de travaux dans le Nord-Pas-de-Calais. Le métier est déjà « ${category} ». Choisis la prestation la plus proche dans le catalogue (id exact). Si aucune ne convient, workOptionId = null et pricingTier = bas (dépannage simple), moyen (pose / réparation unitaire), eleve (rénovation partielle) ou premium (urgence, structure, chantier lourd). Réponds uniquement en JSON : {"workOptionId":"...ou null","pricingTier":"bas|moyen|eleve|premium"}. Catalogue :\n${catalog}`
    : `Tu classifies une demande de travaux en France (Nord / Pas-de-Calais) et tu estimes le ticket artisan (prix de déblocage). Réponds uniquement en JSON : {"category":"...","workOptionId":"...ou null","pricingTier":"bas|moyen|eleve|premium","tradeLabel":"métier courant"}. category doit être exactement l’une des valeurs : ${categoriesList}. workOptionId = id du catalogue si une ligne correspond, sinon null. pricingTier = bas (dépannage simple, 10€), moyen (pose unitaire, 12,5€), eleve (rénovation partielle, 15€), premium (urgence / chantier lourd, 20€). tradeLabel = métier à contacter (ex. vitrier). Catalogue :\n${catalog}`;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: description.slice(0, 2000) },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      category?: string;
      workOptionId?: string | null;
      pricingTier?: string;
      tradeLabel?: string;
    };
    const resolvedCategory =
      category ??
      (parsed.category && isWorkCategory(parsed.category)
        ? parsed.category
        : undefined);
    if (!resolvedCategory) return null;
    const optionId = parsed.workOptionId?.trim() || undefined;
    const option = optionId ? getWorkOptionById(optionId) : undefined;
    const tier = isPricingTierId(String(parsed.pricingTier ?? ""))
      ? (parsed.pricingTier as PricingTierId)
      : undefined;
    return attachOption(
      resolvedCategory,
      category ? "keywords" : "llm",
      option,
      tier,
      option || tier ? "llm" : "fallback",
      parsed.tradeLabel?.trim() || undefined
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
