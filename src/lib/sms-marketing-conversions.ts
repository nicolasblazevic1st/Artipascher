import { formatFrenchPhoneDisplay, normalizeFrenchMobile } from "@/lib/phone-format";
import { readStore } from "@/lib/store";
import type { ProRegistration, SmsCampaign } from "@/lib/store-types";

export interface SmsMarketingConversion {
  phoneDisplay: string;
  phoneE164: string;
  proId: string;
  companyName: string;
  email: string;
  siret: string;
  city: string;
  department: "59" | "62";
  proStatus: ProRegistration["status"];
  registeredAt: string;
  /** Premier SMS marketing connu (prospect ou campagne). */
  firstMarketingSmsAt: string;
  matchBy: Array<"phone" | "siret">;
  campaignIds: string[];
  daysToRegister: number;
}

type MarketTouch = {
  phoneE164?: string;
  siret?: string;
  at: string;
  campaignId?: string;
};

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function collectMarketTouches(campaigns: SmsCampaign[], prospects: {
  siret: string;
  phone?: string;
  lastContactedAt?: string;
}[]): MarketTouch[] {
  const touches: MarketTouch[] = [];

  for (const campaign of campaigns) {
    const at = campaign.sentAt ?? campaign.createdAt;
    for (const r of campaign.recipients) {
      if (r.status !== "sent") continue;
      const phoneE164 = normalizeFrenchMobile(r.phone);
      touches.push({
        phoneE164: phoneE164 ?? undefined,
        siret: r.siret,
        at,
        campaignId: campaign.id,
      });
    }
  }

  for (const p of prospects) {
    if (!p.lastContactedAt) continue;
    const phoneE164 = p.phone ? normalizeFrenchMobile(p.phone) : null;
    touches.push({
      phoneE164: phoneE164 ?? undefined,
      siret: p.siret,
      at: p.lastContactedAt,
    });
  }

  return touches;
}

/**
 * Pros inscrits dont le mobile et/ou le SIRET a reçu un SMS marketing avant l'inscription.
 */
export async function listSmsMarketingConversions(): Promise<{
  conversions: SmsMarketingConversion[];
  stats: {
    total: number;
    byPhone: number;
    bySiret: number;
    byBoth: number;
  };
}> {
  const store = await readStore();
  const touches = collectMarketTouches(
    store.smsCampaigns,
    store.artisanProspects
  );

  const byPhone = new Map<string, MarketTouch[]>();
  const bySiret = new Map<string, MarketTouch[]>();

  for (const t of touches) {
    if (t.phoneE164) {
      const list = byPhone.get(t.phoneE164) ?? [];
      list.push(t);
      byPhone.set(t.phoneE164, list);
    }
    if (t.siret) {
      const list = bySiret.get(t.siret) ?? [];
      list.push(t);
      bySiret.set(t.siret, list);
    }
  }

  const conversions: SmsMarketingConversion[] = [];

  for (const pro of store.proRegistrations) {
    const phoneE164 = normalizeFrenchMobile(pro.phone);
    if (!phoneE164) continue;

    const phoneTouches = byPhone.get(phoneE164) ?? [];
    const siretTouches = bySiret.get(pro.siret) ?? [];

    const priorPhone = phoneTouches.filter(
      (t) => new Date(t.at).getTime() <= new Date(pro.createdAt).getTime()
    );
    const priorSiret = siretTouches.filter(
      (t) => new Date(t.at).getTime() <= new Date(pro.createdAt).getTime()
    );

    if (priorPhone.length === 0 && priorSiret.length === 0) continue;

    const matchBy: Array<"phone" | "siret"> = [];
    if (priorPhone.length > 0) matchBy.push("phone");
    if (priorSiret.length > 0) matchBy.push("siret");

    const allPrior = [...priorPhone, ...priorSiret].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );
    const first = allPrior[0];
    const campaignIds = [
      ...new Set(
        allPrior.map((t) => t.campaignId).filter((id): id is string => Boolean(id))
      ),
    ];

    conversions.push({
      phoneDisplay: formatFrenchPhoneDisplay(phoneE164),
      phoneE164,
      proId: pro.id,
      companyName: pro.companyName,
      email: pro.email,
      siret: pro.siret,
      city: pro.city,
      department: pro.department,
      proStatus: pro.status,
      registeredAt: pro.createdAt,
      firstMarketingSmsAt: first.at,
      matchBy,
      campaignIds,
      daysToRegister: daysBetween(first.at, pro.createdAt),
    });
  }

  conversions.sort(
    (a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
  );

  return {
    conversions,
    stats: {
      total: conversions.length,
      byPhone: conversions.filter((c) => c.matchBy.includes("phone")).length,
      bySiret: conversions.filter((c) => c.matchBy.includes("siret")).length,
      byBoth: conversions.filter(
        (c) => c.matchBy.includes("phone") && c.matchBy.includes("siret")
      ).length,
    },
  };
}
