import { getNafCodesForCategory } from "./naf-codes";
import {
  GENERAL_WORK_CATEGORY,
  isWorkCategory,
  matchCategoryFromSearchText,
  type WorkCategory,
} from "./work-categories";

export type WorkClassification = {
  category: WorkCategory;
  nafCodes: string[];
  source: "keywords" | "ads" | "llm" | "fallback";
  tradeLabel?: string;
};

function fromCategory(
  category: WorkCategory,
  source: WorkClassification["source"],
  tradeLabel?: string
): WorkClassification {
  return {
    category,
    nafCodes: getNafCodesForCategory(category),
    source,
    tradeLabel,
  };
}

/**
 * Déduit le métier / NAF à partir de la description (et d’un indice Ads optionnel).
 * LLM si OPENAI_API_KEY est défini, sinon mots-clés.
 */
export async function classifyWorkFromDescription(
  description: string,
  adsHint?: string | null
): Promise<WorkClassification> {
  const fromText = matchCategoryFromSearchText(description);
  if (fromText) return fromCategory(fromText, "keywords");

  const llm = await classifyWithLlm(description);
  if (llm) return llm;

  const fromAds = matchCategoryFromSearchText(adsHint);
  if (fromAds) return fromCategory(fromAds, "ads");

  return fromCategory(GENERAL_WORK_CATEGORY, "fallback");
}

async function classifyWithLlm(
  description: string
): Promise<WorkClassification | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

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
          {
            role: "system",
            content:
              "Tu classifies une demande de travaux en France (Nord / Pas-de-Calais). Réponds uniquement en JSON : {\"category\":\"...\",\"tradeLabel\":\"métier courant\"}. category doit être exactement l’une des valeurs : Peinture, Plomberie, Électricité, Maçonnerie, Isolation, Chauffage / Pompe à chaleur, Rénovation énergétique, Rénovation complète, Menuiserie (fenêtres, portes, volets), Toiture / Couverture, Carrelage / Revêtements de sol, Placo / Cloisons, Extérieur / Aménagement paysager, Terrassement, Serrurerie, Nettoyage / Multi-services. tradeLabel = métier à contacter (ex. vitrier, étancheur, ramoneur).",
          },
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
      tradeLabel?: string;
    };
    if (!parsed.category || !isWorkCategory(parsed.category)) return null;
    return fromCategory(
      parsed.category,
      "llm",
      parsed.tradeLabel?.trim() || undefined
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
