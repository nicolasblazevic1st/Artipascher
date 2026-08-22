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
import { artisanIsRge } from "./rge-verification";

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

/** Budget enrichissement pour la nuit (solde journalier + report + bonus − prod du jour). */
export async function computeDailyEnrichmentBudget(
  date = new Date()
): Promise<{
  budget: number;
  base: number;
  carryover: number;
  bonusToday: number;
  prodToday: number;
  remainingMonth: number;
  paused: boolean;
}> {
  const quota = await getOrCreateQuota(currentMonthKey(date));
  const days = daysInMonth(date);
  const base = Math.floor(quota.monthlyLimit / days);
  const day = currentDayKey(date);
  const prodToday = quota.dailyProductionLog[day] ?? 0;
  const bonusToday = Math.max(0, quota.dailyEnrichmentBonus?.[day] ?? 0);
  const remainingMonth = Math.max(
    0,
    quota.monthlyLimit - quota.requestsProduction - quota.requestsEnrichment
  );
  const solde = Math.max(
    0,
    base + quota.enrichmentCarryover + bonusToday - prodToday
  );
  // Le bonus du jour peut dépasser le reste mensuel (exception admin).
  const hardCap = quota.paidOverageEnabled
    ? solde
    : Math.min(solde, remainingMonth + bonusToday);
  const budget =
    quota.enrichmentPaused && !quota.paidOverageEnabled ? 0 : hardCap;

  return {
    budget,
    base,
    carryover: quota.enrichmentCarryover,
    bonusToday,
    prodToday,
    remainingMonth,
    paused: quota.enrichmentPaused && !quota.paidOverageEnabled,
  };
}

const MAX_SINGLE_DAILY_BOOST = 2000;

/**
 * Augmente exceptionnellement le budget Places d’enrichissement pour aujourd’hui.
 * Relance aussi l’enrichissement s’il était en pause mensuelle.
 */
export async function boostDailyEnrichmentBudget(extra: number): Promise<{
  added: number;
  bonusToday: number;
  budget: number;
}> {
  const amount = Math.floor(Number(extra));
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error("Indiquez un nombre de requêtes ≥ 1.");
  }
  if (amount > MAX_SINGLE_DAILY_BOOST) {
    throw new Error(
      `Maximum ${MAX_SINGLE_DAILY_BOOST} requêtes par boost (reçu ${amount}).`
    );
  }

  const day = currentDayKey();
  await updateQuota((q) => {
    if (!q.dailyEnrichmentBonus) q.dailyEnrichmentBonus = {};
    q.dailyEnrichmentBonus[day] = (q.dailyEnrichmentBonus[day] ?? 0) + amount;
    // Boost admin = déblocage volontaire pour la journée.
    q.enrichmentPaused = false;
  });

  const daily = await computeDailyEnrichmentBudget();
  return {
    added: amount,
    bonusToday: daily.bonusToday,
    budget: daily.budget,
  };
}

export { MAX_SINGLE_DAILY_BOOST };

export function artisanNeedsGoogleRating(a: EnrichedArtisan): boolean {
  if (a.status !== "active" || a.optedOut) return false;
  if (a.enrichmentStatus === "no_match") return false;
  return typeof a.googleRating !== "number" || !Number.isFinite(a.googleRating);
}

function priorityScore(a: EnrichedArtisan, now: number): number {
  if (a.enrichmentStatus === "invalid_phone" || a.lastSmsFailedAt) return 3000;
  if (artisanIsRge(a) && artisanNeedsGoogleRating(a)) return 2800;
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
    googleRating: result.rating ?? artisan.googleRating,
    googleUserRatingCount:
      result.userRatingCount ?? artisan.googleUserRatingCount,
    googlePlaceId: result.placeId ?? artisan.googlePlaceId,
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

export function isPlacesPhoneTarget(a: EnrichedArtisan): boolean {
  if (a.status !== "active" || a.optedOut) return false;
  if (a.enrichmentStatus === "no_match") return false;
  return !a.phone?.trim() || a.enrichmentStatus === "invalid_phone";
}

/** Cible Places pour compléter une note Google (priorité RGE). */
export function isPlacesRatingTarget(a: EnrichedArtisan): boolean {
  return artisanNeedsGoogleRating(a);
}

/**
 * Enrichissement production : jamais bloqué par le plafond mensuel.
 * Enrichit les artisans du rayon sans téléphone (ou invalid_phone).
 */
export async function enrichNearbyForProduction(
  artisans: EnrichedArtisan[],
  options?: { maxArtisans?: number; includeMissingRatings?: boolean }
): Promise<{
  enriched: number;
  requestsUsed: number;
  errors: string[];
}> {
  const max = options?.maxArtisans ?? 30;
  const phoneTargets = artisans.filter(isPlacesPhoneTarget);
  const ratingTargets = options?.includeMissingRatings
    ? artisans
        .filter((a) => isPlacesRatingTarget(a) && !isPlacesPhoneTarget(a))
        .sort((a, b) => Number(artisanIsRge(b)) - Number(artisanIsRge(a)))
    : [];
  const targets = [...phoneTargets, ...ratingTargets].slice(0, max);

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

/**
 * Enrichit dans l’ordre fourni (ex. plus proches d’abord) jusqu’à trouver
 * `targetNewPhones` numéros, ou atteindre `maxAttempts`.
 */
export async function enrichUntilPhoneTarget(
  artisans: EnrichedArtisan[],
  options: { targetNewPhones: number; maxAttempts?: number }
): Promise<{
  enriched: number;
  attempts: number;
  requestsUsed: number;
  errors: string[];
  phonesBySiret: Map<string, string>;
}> {
  const target = Math.max(0, Math.floor(options.targetNewPhones));
  const maxAttempts = Math.max(
    0,
    Math.floor(options.maxAttempts ?? Math.min(80, Math.max(24, target * 6)))
  );
  const phonesBySiret = new Map<string, string>();

  if (target <= 0 || maxAttempts <= 0 || !isGooglePlacesEnabled()) {
    return {
      enriched: 0,
      attempts: 0,
      requestsUsed: 0,
      errors: [],
      phonesBySiret,
    };
  }

  const targets = artisans.filter(isPlacesPhoneTarget);
  let requestsUsed = 0;
  let enriched = 0;
  let attempts = 0;
  const errors: string[] = [];

  for (const a of targets) {
    if (enriched >= target || attempts >= maxAttempts) break;
    attempts += 1;
    const res = await enrichArtisanWithPlaces(a, "production");
    requestsUsed += res.requestsUsed;
    if (res.error) errors.push(`${a.siret}: ${res.error}`);
    const phone = res.artisan?.phone?.trim();
    if (phone) {
      enriched += 1;
      phonesBySiret.set(a.siret, phone);
    }
  }

  await addEnrichmentJob({
    kind: "places_production",
    ranAt: new Date().toISOString(),
    requestsSpent: requestsUsed,
    processed: attempts,
    skipped: 0,
    errors,
    note: `Cible campagne: ${enriched}/${target} tél. (${attempts} tentatives)`,
  });

  return { enriched, attempts, requestsUsed, errors, phonesBySiret };
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
