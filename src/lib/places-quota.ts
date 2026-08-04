import {
  addEnrichmentJob,
  currentDayKey,
  currentMonthKey,
  daysInMonth,
  getOrCreateQuota,
  listArtisans,
  updateArtisanBySiret,
  updateQuota,
} from "./artisans-db";
import type { EnrichedArtisan } from "./artisans-types";
import { STALE_ENRICHMENT_MS } from "./artisans-types";
import { isGooglePlacesEnabled, lookupPlacePhone } from "./google-places";

export type PlacesSpendKind = "production" | "enrichment";

export async function recordPlacesSpend(
  kind: PlacesSpendKind,
  count: number
): Promise<void> {
  if (count <= 0) return;
  const day = currentDayKey();
  await updateQuota((q) => {
    if (kind === "production") {
      q.requestsProduction += count;
      q.dailyProductionLog[day] = (q.dailyProductionLog[day] ?? 0) + count;
    } else {
      q.requestsEnrichment += count;
    }
    const used = q.requestsProduction + q.requestsEnrichment;
    if (used >= q.monthlyLimit && !q.paidOverageEnabled) {
      q.enrichmentPaused = true;
    }
  });
}

/** Budget enrichissement pour la nuit (solde journalier + report − prod du jour). */
export async function computeDailyEnrichmentBudget(
  date = new Date()
): Promise<{
  budget: number;
  base: number;
  carryover: number;
  prodToday: number;
  remainingMonth: number;
  paused: boolean;
}> {
  const quota = await getOrCreateQuota(currentMonthKey(date));
  const days = daysInMonth(date);
  const base = Math.floor(quota.monthlyLimit / days);
  const day = currentDayKey(date);
  const prodToday = quota.dailyProductionLog[day] ?? 0;
  const remainingMonth = Math.max(
    0,
    quota.monthlyLimit - quota.requestsProduction - quota.requestsEnrichment
  );
  const solde = Math.max(0, base + quota.enrichmentCarryover - prodToday);
  const budget =
    quota.enrichmentPaused && !quota.paidOverageEnabled
      ? 0
      : Math.min(solde, remainingMonth);

  return {
    budget,
    base,
    carryover: quota.enrichmentCarryover,
    prodToday,
    remainingMonth,
    paused: quota.enrichmentPaused && !quota.paidOverageEnabled,
  };
}

function priorityScore(a: EnrichedArtisan, now: number): number {
  if (a.enrichmentStatus === "invalid_phone" || a.lastSmsFailedAt) return 3000;
  if (a.enrichmentStatus === "pending" || !a.phone) return 2000;
  const verified = a.lastVerifiedAt ? new Date(a.lastVerifiedAt).getTime() : 0;
  if (!verified || now - verified > STALE_ENRICHMENT_MS) return 1000;
  return 0;
}

export async function selectEnrichmentQueue(
  limit: number
): Promise<EnrichedArtisan[]> {
  const now = Date.now();
  const active = await listArtisans({ status: "active" });
  return active
    .filter((a) => !a.optedOut)
    .map((a) => ({ a, score: priorityScore(a, now) }))
    .filter(({ score }) => score > 0)
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score;
      const ax = x.a.companyCreatedAt
        ? new Date(x.a.companyCreatedAt).getTime()
        : 0;
      const ay = y.a.companyCreatedAt
        ? new Date(y.a.companyCreatedAt).getTime()
        : 0;
      return ay - ax;
    })
    .slice(0, Math.max(0, limit))
    .map(({ a }) => a);
}

export async function enrichArtisanWithPlaces(
  artisan: EnrichedArtisan,
  kind: PlacesSpendKind
): Promise<{
  artisan: EnrichedArtisan | null;
  requestsUsed: number;
  error?: string;
}> {
  if (!isGooglePlacesEnabled()) {
    return {
      artisan: null,
      requestsUsed: 0,
      error: "Google Places non configuré.",
    };
  }

  const result = await lookupPlacePhone({
    companyName: artisan.companyName,
    addressLine: artisan.addressLine,
    postalCode: artisan.postalCode,
    city: artisan.city,
  });

  if (result.requestsUsed > 0) {
    await recordPlacesSpend(kind, result.requestsUsed);
  }

  if (!result.ok) {
    return {
      artisan: null,
      requestsUsed: result.requestsUsed,
      error: result.error,
    };
  }

  const now = new Date().toISOString();
  const updated = await updateArtisanBySiret(artisan.siret, {
    phone: result.phone ?? artisan.phone,
    website: result.website ?? artisan.website,
    enrichmentStatus: result.phone
      ? "enriched"
      : result.matched
        ? "no_match"
        : "no_match",
    enrichedAt: now,
    lastVerifiedAt: now,
    lastSmsFailedAt: result.phone ? undefined : artisan.lastSmsFailedAt,
  });

  return { artisan: updated, requestsUsed: result.requestsUsed };
}

/**
 * Enrichissement production : jamais bloqué par le plafond mensuel.
 * Enrichit les artisans du rayon sans téléphone (ou invalid_phone).
 */
export async function enrichNearbyForProduction(
  artisans: EnrichedArtisan[],
  options?: { maxArtisans?: number }
): Promise<{
  enriched: number;
  requestsUsed: number;
  errors: string[];
}> {
  const max = options?.maxArtisans ?? 30;
  const targets = artisans
    .filter(
      (a) =>
        a.status === "active" &&
        !a.optedOut &&
        (!a.phone?.trim() || a.enrichmentStatus === "invalid_phone")
    )
    .slice(0, max);

  let requestsUsed = 0;
  let enriched = 0;
  const errors: string[] = [];

  for (const a of targets) {
    const res = await enrichArtisanWithPlaces(a, "production");
    requestsUsed += res.requestsUsed;
    if (res.error) errors.push(`${a.siret}: ${res.error}`);
    if (res.artisan?.phone) enriched += 1;
  }

  await addEnrichmentJob({
    kind: "places_production",
    ranAt: new Date().toISOString(),
    requestsSpent: requestsUsed,
    processed: targets.length,
    skipped: 0,
    errors,
    note: `Production: ${enriched} tél. trouvés`,
  });

  return { enriched, requestsUsed, errors };
}

/** Cron nocturne : consomme le budget journalier d'enrichissement. */
export async function runDailyPlacesEnrichment(): Promise<{
  budget: number;
  spent: number;
  processed: number;
  paused: boolean;
  errors: string[];
}> {
  const { budget, paused } = await computeDailyEnrichmentBudget();
  if (paused || budget <= 0) {
    await addEnrichmentJob({
      kind: "places_daily",
      ranAt: new Date().toISOString(),
      requestsSpent: 0,
      processed: 0,
      skipped: 0,
      errors: [],
      note: paused ? "Enrichissement en pause (quota mensuel)" : "Budget 0",
    });
    return { budget, spent: 0, processed: 0, paused, errors: [] };
  }

  // Approx 2 requêtes par fiche → traiter budget/2 fiches max
  const queue = await selectEnrichmentQueue(Math.ceil(budget / 2) + 5);
  let spent = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const a of queue) {
    if (spent >= budget) break;
    const res = await enrichArtisanWithPlaces(a, "enrichment");
    spent += res.requestsUsed;
    processed += 1;
    if (res.error) errors.push(`${a.siret}: ${res.error}`);
  }

  const unused = Math.max(0, budget - spent);
  await updateQuota((q) => {
    q.enrichmentCarryover = unused;
  });

  await addEnrichmentJob({
    kind: "places_daily",
    ranAt: new Date().toISOString(),
    requestsSpent: spent,
    processed,
    skipped: Math.max(0, queue.length - processed),
    errors,
    note: `Budget ${budget}, report ${unused}`,
  });

  return { budget, spent, processed, paused: false, errors };
}

export async function markArtisanPhoneInvalid(siret: string): Promise<void> {
  await updateArtisanBySiret(siret, {
    enrichmentStatus: "invalid_phone",
    lastSmsFailedAt: new Date().toISOString(),
  });
}
