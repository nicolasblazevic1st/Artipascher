"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAdminJson } from "@/lib/admin-fetch-json";
import {
  COMPANY_AGE_ESTABLISHED_SHORT,
  COMPANY_AGE_YOUNG_SHORT,
} from "@/lib/company-age";
import { estimateSmsCredits } from "@/lib/sms-gsm";
import type {
  SmsAcquisitionCampaign,
  SmsCampaign,
  SmsCampaignSettings,
  SmsCohort,
} from "@/lib/store-types";

interface AcquisitionRow extends SmsAcquisitionCampaign {
  category?: string;
  city?: string;
  department?: string;
  auctionId?: string;
  acceptedCount: number;
  maxAccepted: number;
  smsQuota?: number;
  remainingSms?: number;
  sentToday: number;
}

interface WorkRequestOption {
  id: string;
  category: string;
  city: string;
  department: string;
  status: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  clientKind?: string;
  auctionId?: string;
  createdAt: string;
  maxContactArtisans?: number;
  smsQuota?: number;
}

interface Candidate {
  siret: string;
  companyName: string;
  city: string;
  department: string;
  nafCode?: string;
  phone: string;
  cohort: SmsCohort;
  companyCreatedAt?: string;
  lastContactedAt?: string;
  source: string;
  selectedByDefault: boolean;
  googleRating?: number;
  googleUserRatingCount?: number;
  bodaccStatus?: "clear" | "active_procedure" | "unavailable" | "unchecked";
  bodaccNature?: string;
}

interface Preview {
  workRequestId: string;
  category: string;
  city: string;
  department: string;
  auctionUrl: string;
  defaultMessage: string;
  campaignSize: number;
  artisansWanted?: number;
  smsPerArtisan?: number;
  preferEstablishedCompany?: boolean;
  requireRge?: boolean;
  minGoogleRating?: number;
  geoFound: boolean;
  totalNearby: number;
  gouvCount: number;
  platformCount: number;
  alreadyMarketedCount?: number;
  bodaccExcluded?: number;
  shortfall?: number;
  radiusKm?: number;
  cohortCounts: Record<SmsCohort, number>;
  suggestedCounts: Record<SmsCohort, number>;
  candidates: Candidate[];
  withoutPhone: Array<{
    siret: string;
    companyName: string;
    city: string;
    companyCreatedAt?: string;
    source: string;
    distanceKm?: number;
    googleRating?: number;
    googleUserRatingCount?: number;
    bodaccStatus?: "clear" | "active_procedure" | "unavailable" | "unchecked";
    bodaccNature?: string;
  }>;
  placesFill?: {
    enabled: boolean;
    targetPhones: number;
    phonesBefore: number;
    phonesAfter: number;
    attempts: number;
    phonesFound: number;
    requestsUsed: number;
  };
}

type ListRow =
  | { kind: "ready"; candidate: Candidate }
  | {
      kind: "no_phone";
      row: Preview["withoutPhone"][number];
    };

const COHORT_LABELS: Record<SmsCohort, string> = {
  returning: "Déjà contactés",
  new_young: COMPANY_AGE_YOUNG_SHORT,
  new_established: COMPANY_AGE_ESTABLISHED_SHORT,
};

const STATUS_LABELS: Record<SmsCampaign["status"], string> = {
  sent: "Envoyé",
  demo: "Simulé (démo)",
  failed: "Échec partiel",
  pending_review: "Lot à valider",
  cancelled: "Annulé",
};

function LoadingBar({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
          aria-hidden
        />
        <span className="font-medium">{label}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
      </div>
    </div>
  );
}

function formatGoogleRating(
  rating?: number,
  reviews?: number
): { text: string; className: string } {
  if (typeof rating !== "number") {
    return { text: "—", className: "text-slate-400" };
  }
  const suffix =
    typeof reviews === "number" ? ` (${reviews})` : "";
  const text = `${rating.toFixed(1).replace(".", ",")}${suffix}`;
  if (rating < 4) return { text, className: "font-medium text-red-700" };
  return { text, className: "font-medium text-emerald-800" };
}

function hasDisplayedGoogleRating(
  rating: number | undefined,
  minRating?: number
): boolean {
  if (typeof rating !== "number") return false;
  if (minRating == null) return true;
  return rating >= minRating;
}

function formatBodaccStatus(
  status?: "clear" | "active_procedure" | "unavailable" | "unchecked",
  nature?: string
): { text: string; className: string } {
  if (status === "clear") {
    return { text: "OK", className: "rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800" };
  }
  if (status === "active_procedure") {
    return {
      text: nature ? `Procédure · ${nature}` : "Procédure",
      className: "rounded bg-red-100 px-1.5 py-0.5 text-red-800",
    };
  }
  if (status === "unavailable") {
    return { text: "Indispo", className: "rounded bg-amber-100 px-1.5 py-0.5 text-amber-900" };
  }
  return { text: "Non scanné", className: "rounded bg-slate-100 px-1.5 py-0.5 text-slate-600" };
}

const ACQ_STATUS_LABELS: Record<SmsAcquisitionCampaign["status"], string> = {
  active: "Active",
  completed: "Terminée (objectif atteint)",
  paused: "En pause",
  exhausted: "Épuisée (plus de destinataires)",
};

type PlacesFreeUsage = {
  httpUsed: number;
  httpLimit: number;
  httpRemaining: number;
  textSearchUsed: number;
  textSearchLimit: number;
  textSearchRemaining: number;
  placeDetailsUsed: number;
  placeDetailsLimit: number;
  placeDetailsRemaining: number;
  hasSkuSplit: boolean;
};

function quotaTone(remaining: number, limit: number): string {
  if (limit <= 0) return "text-slate-700";
  const ratio = remaining / limit;
  if (ratio <= 0.15) return "text-red-800";
  if (ratio <= 0.4) return "text-amber-800";
  return "text-emerald-800";
}

function PlacesFreeQuotaCard({
  stats,
}: {
  stats: {
    remaining: number;
    placesEnabled: boolean;
    quota: {
      requestsProduction: number;
      requestsEnrichment: number;
      monthlyLimit: number;
    };
    placesFree?: PlacesFreeUsage;
  } | null;
}) {
  if (!stats) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Quota Places Google : chargement…
      </div>
    );
  }

  const free = stats.placesFree;
  const used = free?.httpUsed ??
    stats.quota.requestsProduction + stats.quota.requestsEnrichment;
  const limit = free?.httpLimit ?? stats.quota.monthlyLimit;
  const remaining = free?.httpRemaining ?? stats.remaining;
  const detailsTight =
    free?.hasSkuSplit === true &&
    free.placeDetailsRemaining <= Math.min(200, free.placeDetailsLimit * 0.2);

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 text-xs ${
        detailsTight
          ? "border-amber-300 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-900">
          Places Google — offert ce mois
        </p>
        <p className={quotaTone(remaining, limit)}>
          <strong>
            {used} / {limit}
          </strong>{" "}
          appels · reste {remaining}
        </p>
      </div>
      {free?.hasSkuSplit ? (
        <div className="mt-1.5 grid gap-1 text-slate-600 sm:grid-cols-2">
          <div className={quotaTone(free.textSearchRemaining, free.textSearchLimit)}>
            Recherches : {free.textSearchUsed} / {free.textSearchLimit} · reste{" "}
            {free.textSearchRemaining}
          </div>
          <div
            className={quotaTone(
              free.placeDetailsRemaining,
              free.placeDetailsLimit
            )}
          >
            Fiches note + tél. : {free.placeDetailsUsed} / {free.placeDetailsLimit}{" "}
            · reste {free.placeDetailsRemaining}
          </div>
        </div>
      ) : (
        <p className="mt-1 text-slate-600">
          Google offre 5 000 recherches et 1 000 fiches (note + tél.) par mois.
          Au-delà, c’est payant. Le détail recherche / fiche se remplira au
          prochain appel.
        </p>
      )}
      <p className="mt-1 text-slate-500">
        {stats.placesEnabled
          ? "Une prévisualisation peut consommer des appels si des notes ou des tél. manquent."
          : "Places n’est pas activé : aucun appel Google depuis cette page."}
      </p>
    </div>
  );
}

export default function AdminSmsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [pendingReview, setPendingReview] = useState<SmsCampaign[]>([]);
  const [acquisitions, setAcquisitions] = useState<AcquisitionRow[]>([]);
  const [requests, setRequests] = useState<WorkRequestOption[]>([]);
  const [settings, setSettings] = useState<SmsCampaignSettings | null>(null);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState(false);
  // false au 1er rendu (SSR = client) pour éviter mismatch hydration sur disabled
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [campaignSize, setCampaignSize] = useState(5);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedSirets, setSelectedSirets] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [savingPhone, setSavingPhone] = useState<string | null>(null);
  const [artisanStats, setArtisanStats] = useState<{
    total: number;
    active: number;
    withPhone: number;
    pendingEnrichment: number;
    invalidPhone: number;
    remaining: number;
    placesEnabled: boolean;
    quota: {
      requestsProduction: number;
      requestsEnrichment: number;
      monthlyLimit: number;
      enrichmentPaused: boolean;
      enrichmentCarryover: number;
    };
    dailyBudget: {
      budget: number;
      paused: boolean;
      prodToday: number;
      bonusToday?: number;
    };
    placesFree?: {
      httpUsed: number;
      httpLimit: number;
      httpRemaining: number;
      textSearchUsed: number;
      textSearchLimit: number;
      textSearchRemaining: number;
      placeDetailsUsed: number;
      placeDetailsLimit: number;
      placeDetailsRemaining: number;
      hasSkuSplit: boolean;
    };
  } | null>(null);
  const [artisanBusy, setArtisanBusy] = useState<string | null>(null);
  const [placesBoost, setPlacesBoost] = useState("100");
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"todo" | "launch" | "track" | "tools">(
    "launch"
  );
  const [tabReady, setTabReady] = useState(false);

  const loadArtisanStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/artisans/stats");
      const data = await res.json();
      if (res.ok) setArtisanStats(data);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/sms-campaigns");
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? `Chargement impossible (${res.status}).`);
        return;
      }
      setCampaigns(data.campaigns ?? []);
      setPendingReview(data.pendingReview ?? []);
      setAcquisitions(data.acquisitions ?? []);
      setRequests(data.requests ?? []);
      setSettings(data.settings ?? null);
      setCampaignSize(5);
      setSmsConfigured(data.smsConfigured === true);
      setDemoAllowed(data.demoAllowed === true);
    } catch {
      setLoadError("Impossible de joindre l’API admin SMS.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void load();
    void loadArtisanStats();
  }, [load, loadArtisanStats]);

  useEffect(() => {
    if (tabReady || loading) return;
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("request");
    if (requestId) {
      setSelectedId(requestId);
      setTab("launch");
    } else if (pendingReview.length > 0) {
      setTab("todo");
    } else {
      setTab("launch");
    }
    setTabReady(true);
  }, [loading, pendingReview.length, tabReady]);

  /** Évite mismatch SSR/client sur l'attribut HTML disabled. */
  function disableWhen(condition: boolean): boolean | undefined {
    if (!mounted) return undefined;
    return condition || undefined;
  }

  async function runSireneExtract() {
    setArtisanBusy("sirene");
    setError(null);
    try {
      const res = await fetch("/api/admin/artisans/extract-sirene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPagesPerNaf: 2, geocodeMissing: false }),
      });
      const data = await readAdminJson<{
        error?: string;
        started?: boolean;
        message?: string;
        result?: { upserted?: number; geocoded?: number; pages?: number };
      }>(res);
      if (!res.ok) {
        setError(data.error ?? "Extraction SIRENE impossible.");
        return;
      }
      if (data.started) {
        setSuccess(
          data.message ??
            "Sync SIRENE lancée en arrière-plan. Rechargez les stats ensuite."
        );
      } else {
        setSuccess(
          `SIRENE : ${data.result?.upserted ?? 0} fiches, ${data.result?.geocoded ?? 0} géocodées (${data.result?.pages ?? 0} pages).`
        );
      }
      await loadArtisanStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau extraction SIRENE.");
    } finally {
      setArtisanBusy(null);
    }
  }

  async function runPlacesEnrich() {
    setArtisanBusy("places");
    setError(null);
    try {
      const res = await fetch("/api/admin/artisans/enrich-places", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enrichissement Places impossible.");
        return;
      }
      setSuccess(
        data.result.paused
          ? "Enrichissement en pause (quota mensuel)."
          : `Places : ${data.result.processed} fiches, ${data.result.spent}/${data.result.budget} req.`
      );
      await loadArtisanStats();
    } catch {
      setError("Erreur réseau enrichissement Places.");
    } finally {
      setArtisanBusy(null);
    }
  }

  async function boostPlacesQuota() {
    const extra = Math.floor(Number(placesBoost));
    if (!Number.isFinite(extra) || extra < 1) {
      setError("Indiquez un nombre de requêtes Places ≥ 1.");
      return;
    }
    setArtisanBusy("places-boost");
    setError(null);
    try {
      const res = await fetch("/api/admin/artisans/places-quota-boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra }),
      });
      const data = await readAdminJson<{
        error?: string;
        added?: number;
        bonusToday?: number;
        budget?: number;
      }>(res);
      if (!res.ok) {
        setError(data.error ?? "Boost Places impossible.");
        return;
      }
      setSuccess(
        `Budget Places jour +${data.added ?? extra} · bonus ${data.bonusToday ?? "?"} · budget ${data.budget ?? "?"}`
      );
      await loadArtisanStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur boost Places.");
    } finally {
      setArtisanBusy(null);
    }
  }

  async function handlePreview() {
    if (!selectedId) return;
    setPreviewLoading(true);
    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      const res = await fetch(
        `/api/admin/sms-campaigns/preview?workRequestId=${encodeURIComponent(selectedId)}&campaignSize=${campaignSize}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Aperçu impossible.");
        return;
      }

      const p = data.preview as Preview;
      setPreview(p);
      setMessage(p.defaultMessage);
      setSelectedSirets(
        new Set(
          p.candidates
            .filter((c) => c.selectedByDefault)
            .filter((c) =>
              p.minGoogleRating == null
                ? true
                : hasDisplayedGoogleRating(c.googleRating, p.minGoogleRating)
            )
            .map((c) => c.siret)
        )
      );
    } catch {
      setError(
        "La prévisualisation a échoué ou a trop duré. Places cherche notes et tél. : réessayez, ou baissez le volume du lot."
      );
    } finally {
      setPreviewLoading(false);
      void loadArtisanStats();
    }
  }

  function toggleSiret(siret: string) {
    setSelectedSirets((prev) => {
      const next = new Set(prev);
      if (next.has(siret)) next.delete(siret);
      else next.add(siret);
      return next;
    });
  }

  function ratedCandidates() {
    if (!preview) return [];
    if (preview.minGoogleRating == null) return preview.candidates;
    return preview.candidates.filter((c) =>
      hasDisplayedGoogleRating(c.googleRating, preview.minGoogleRating)
    );
  }

  function selectAll() {
    if (!preview) return;
    setSelectedSirets(new Set(ratedCandidates().map((c) => c.siret)));
  }

  function selectSuggested() {
    if (!preview) return;
    setSelectedSirets(
      new Set(
        ratedCandidates()
          .filter((c) => c.selectedByDefault)
          .map((c) => c.siret)
      )
    );
  }

  function clearSelection() {
    setSelectedSirets(new Set());
  }

  async function handleStartCampaign(demo = false) {
    if (!selectedId) return;
    if (preview && selectedSirets.size === 0) {
      setError("Cochez au moins un destinataire pour le lot du jour.");
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/sms-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          workRequestId: selectedId,
          message: message.trim() || undefined,
          demo,
          smsPerDay: campaignSize,
          recipientSirets: preview ? Array.from(selectedSirets) : undefined,
          recipients: preview
            ? preview.candidates
                .filter((c) => selectedSirets.has(c.siret))
                .map((c) => ({
                  siret: c.siret,
                  companyName: c.companyName,
                  phone: c.phone,
                  cohort: c.cohort,
                }))
            : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Démarrage impossible.");
        return;
      }

      const result = data.result as {
        acquisition: SmsAcquisitionCampaign;
        acceptedCount: number;
        batch?: SmsCampaign;
        skippedReason?: string;
      };
      const sent = result.batch?.sentCount ?? 0;
      const prepared = result.batch?.status === "pending_review";
      setSuccess(
        result.skippedReason && sent === 0 && !prepared
          ? `Campagne ${result.acquisition.status} — ${result.skippedReason} (contacts ${result.acceptedCount}/5).`
          : prepared
            ? `Lot préparé pour validation (${result.batch?.recipientCount ?? 0} destinataires) · contacts ${result.acceptedCount}/5 · campagne ${result.acquisition.status}.`
            : `${demo ? "Simulation" : "Lot"} : ${sent} SMS · contacts ${result.acceptedCount}/5 · campagne ${result.acquisition.status}.`
      );
      setTab(prepared ? "todo" : "track");
      await load();
    } catch {
      setError("Erreur réseau pendant le démarrage.");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleAutoSend(batchId: string, autoSend: boolean) {
    setError(null);
    setSuccess(null);
    setPendingReview((rows) =>
      rows.map((row) => (row.id === batchId ? { ...row, autoSend } : row))
    );
    try {
      const res = await fetch("/api/admin/sms-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-send", batchId, autoSend }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPendingReview((rows) =>
          rows.map((row) =>
            row.id === batchId ? { ...row, autoSend: !autoSend } : row
          )
        );
        setError(data.error ?? "Impossible de cocher l’envoi auto.");
        return;
      }
      setSuccess(
        autoSend
          ? "Lot prêt à partir : le cron l’enverra à 8h (lun–sam)."
          : "Envoi auto désactivé. Ce lot ne partira plus tout seul."
      );
    } catch {
      setPendingReview((rows) =>
        rows.map((row) =>
          row.id === batchId ? { ...row, autoSend: !autoSend } : row
        )
      );
      setError("Erreur réseau pendant la mise à jour.");
    }
  }

  async function handleDiscardBatch(batchId: string) {
    if (
      !window.confirm(
        "Supprimer ce lot ? Aucun SMS ne sera envoyé. Vous pourrez en préparer un autre."
      )
    ) {
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/sms-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard", batchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Suppression impossible.");
        return;
      }
      setSuccess("Lot supprimé. Aucun SMS envoyé.");
      await load();
    } catch {
      setError("Erreur réseau pendant la suppression.");
    } finally {
      setSending(false);
    }
  }

  async function handleApproveBatch(batchId: string, demo = false) {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/sms-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", batchId, demo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Validation / envoi impossible.");
        return;
      }
      const result = data.result as {
        batch?: SmsCampaign;
        skippedReason?: string;
        acceptedCount?: number;
      };
      if (result.skippedReason === "slots_full") {
        setSuccess(
          `Objectif déjà atteint (${result.acceptedCount ?? 5}/5) — lot annulé, aucun SMS OVH.`
        );
      } else if (result.skippedReason) {
        setSuccess(`Lot non envoyé : ${result.skippedReason}`);
      } else {
        setSuccess(
          `Lot validé : ${result.batch?.sentCount ?? 0}/${result.batch?.recipientCount ?? 0} SMS ${
            demo ? "(simulation)" : "envoyés"
          }.`
        );
      }
      setTab("track");
      await load();
    } catch {
      setError("Erreur réseau pendant la validation.");
    } finally {
      setSending(false);
    }
  }

  async function handleAcquisitionAction(
    acquisitionId: string,
    action: "tick" | "pause" | "resume",
    demo = false
  ) {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/sms-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, acquisitionId, demo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action impossible.");
        return;
      }
      if (action === "tick") {
        const result = data.result as {
          acceptedCount: number;
          batch?: SmsCampaign;
          skippedReason?: string;
          acquisition: SmsAcquisitionCampaign;
        };
        setSuccess(
          result.skippedReason && !result.batch
            ? `Lot du jour ignoré : ${result.skippedReason}`
            : `Lot du jour : ${result.batch?.sentCount ?? 0} SMS · contacts ${result.acceptedCount}/5 · ${result.acquisition.status}`
        );
      } else {
        setSuccess(
          action === "pause" ? "Campagne mise en pause." : "Campagne reprise."
        );
      }
      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSending(false);
    }
  }

  async function saveSettings(patch: Partial<SmsCampaignSettings>) {
    const res = await fetch("/api/admin/sms-campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) setSettings(data.settings);
    else setError(data.error ?? "Enregistrement réglages impossible.");
  }

  async function savePhone(row: Preview["withoutPhone"][number]) {
    const phone = phoneDrafts[row.siret]?.trim();
    if (!phone) return;
    setSavingPhone(row.siret);
    setError(null);
    try {
      const res = await fetch("/api/admin/prospects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siret: row.siret,
          companyName: row.companyName,
          city: row.city,
          phone,
          companyCreatedAt: row.companyCreatedAt,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Enregistrement téléphone impossible.");
        return;
      }
      await handlePreview();
    } catch {
      setError("Erreur réseau pendant l’enregistrement du téléphone.");
    } finally {
      setSavingPhone(null);
    }
  }

  const selectedCount = selectedSirets.size;
  const smsCost = useMemo(() => estimateSmsCredits(message), [message]);
  const selectedByCohort = useMemo(() => {
    if (!preview) return null;
    const counts = { returning: 0, new_young: 0, new_established: 0 };
    for (const c of preview.candidates) {
      if (selectedSirets.has(c.siret)) counts[c.cohort] += 1;
    }
    return counts;
  }, [preview, selectedSirets]);

  const allRows: ListRow[] = useMemo(() => {
    if (!preview) return [];
    const min = preview.minGoogleRating;
    const candidates =
      min == null
        ? preview.candidates
        : preview.candidates.filter((c) =>
            hasDisplayedGoogleRating(c.googleRating, min)
          );
    const withoutPhone =
      min == null
        ? preview.withoutPhone
        : preview.withoutPhone.filter((row) =>
            hasDisplayedGoogleRating(row.googleRating, min)
          );
    return [
      ...candidates.map((candidate) => ({ kind: "ready" as const, candidate })),
      ...withoutPhone.map((row) => ({ kind: "no_phone" as const, row })),
    ];
  }, [preview]);

  const selectedRequest = requests.find((r) => r.id === selectedId);
  const acceptedForSelected =
    acquisitions.find((a) => a.workRequestId === selectedId)?.acceptedCount ?? 0;
  const maxForSelected =
    selectedRequest?.maxContactArtisans ??
    acquisitions.find((a) => a.workRequestId === selectedId)?.maxAccepted ??
    5;

  useEffect(() => {
    if (!selectedRequest) return;
    const quota = selectedRequest.smsQuota ?? (selectedRequest.maxContactArtisans ?? 5) * 5;
    setCampaignSize(quota);
  }, [selectedRequest]);
  const reviewBeforeSend = settings?.requireReviewBeforeSend !== false;
  const excludedCount =
    (preview?.platformCount ?? 0) +
    (preview?.alreadyMarketedCount ?? 0) +
    (preview?.bodaccExcluded ?? 0);

  const tabs: Array<{
    id: "todo" | "launch" | "track" | "tools";
    label: string;
    badge?: number;
  }> = [
    {
      id: "todo",
      label: "À faire",
      badge: pendingReview.length || undefined,
    },
    { id: "launch", label: "Lancer" },
    { id: "track", label: "Suivre" },
    { id: "tools", label: "Outils" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Campagnes SMS</h1>
      <p className="mt-1 text-sm text-slate-600">
        Une <strong>campagne</strong> court jusqu&apos;à 5 contacts. Chaque jour
        un <strong>lot</strong> (budget SMS) est préparé ou envoyé. Plus proches
        d&apos;abord (59+62).
      </p>
      <p className="mt-1 text-xs text-slate-500">
        <Link
          href="/admin/conversions-sms"
          className="font-medium text-brand-700 underline"
        >
          Conversions SMS → comptes
        </Link>
      </p>

      {loading && (
        <div className="mt-4">
          <LoadingBar label="Chargement des demandes, réglages et historique…" />
        </div>
      )}

      {loadError && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}{" "}
          <button type="button" onClick={load} className="font-medium underline">
            Réessayer
          </button>
        </p>
      )}

      {(error || success) && (
        <div className="mt-4 space-y-2">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            loading
              ? "bg-slate-100 text-slate-500"
              : smsConfigured
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {loading
            ? "OVH SMS : chargement…"
            : smsConfigured
              ? "OVH SMS configuré"
              : "OVH SMS non configuré"}
        </span>
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            loading
              ? "bg-slate-100 text-slate-500"
              : demoAllowed
                ? "bg-slate-100 text-slate-700"
                : "bg-orange-100 text-orange-800"
          }`}
        >
          {loading
            ? "Démo : chargement…"
            : demoAllowed
              ? "Simulation (démo) disponible"
              : "Simulation indisponible (OVH actif en prod)"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          {loading
            ? "Demandes : …"
            : `${requests.length} demande${requests.length !== 1 ? "s" : ""} éligible${requests.length !== 1 ? "s" : ""}`}
        </span>
        {pendingReview.length > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900">
            {pendingReview.length} lot{pendingReview.length > 1 ? "s" : ""} à
            valider
          </span>
        )}
      </div>

      <div
        className="mt-6 flex flex-wrap gap-1 border-b border-slate-200"
        role="tablist"
        aria-label="Sections campagnes SMS"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-b-2 border-brand-600 text-brand-800"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {typeof t.badge === "number" && t.badge > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "tools" && (
      <>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-semibold text-slate-900">
          Base artisans (SIRENE + Google Places)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {artisanStats?.placesEnabled
            ? "Places activé. Prévisualisation : parcours du plus proche au plus loin ; Places seulement si pas de téléphone, jusqu’à N SMS."
            : <>
                Places désactivé tant que{" "}
                <code className="rounded bg-slate-100 px-1">GOOGLE_PLACES_ENABLED=true</code>{" "}
                n&apos;est pas posé — seuls les numéros déjà en base partent en SMS.
              </>}
          {" "}L’enrichissement nocturne / bouton ci-dessous continue de grossir la base hors campagne.
        </p>
        {artisanStats ? (
          <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              Actifs : <strong>{artisanStats.active}</strong> / {artisanStats.total}
            </div>
            <div>
              Avec tél : <strong>{artisanStats.withPhone}</strong>
            </div>
            <div>
              Pending : <strong>{artisanStats.pendingEnrichment}</strong> · Invalid :{" "}
              <strong>{artisanStats.invalidPhone}</strong>
            </div>
            <div>
              Quota :{" "}
              <strong>
                {artisanStats.placesFree?.httpUsed ??
                  artisanStats.quota.requestsProduction +
                    artisanStats.quota.requestsEnrichment}
                /
                {artisanStats.placesFree?.httpLimit ??
                  artisanStats.quota.monthlyLimit}
              </strong>{" "}
              (reste{" "}
              {artisanStats.placesFree?.httpRemaining ?? artisanStats.remaining})
            </div>
            <div>
              Prod ce mois : {artisanStats.quota.requestsProduction} · Enrich :{" "}
              {artisanStats.quota.requestsEnrichment}
            </div>
            <div>
              Budget jour : {artisanStats.dailyBudget.budget}
              {artisanStats.dailyBudget.paused ? " (pause)" : ""}
              {(artisanStats.dailyBudget.bonusToday ?? 0) > 0
                ? ` · bonus ${artisanStats.dailyBudget.bonusToday}`
                : ""}{" "}
              · prod jour {artisanStats.dailyBudget.prodToday}
            </div>
            <div>
              Places :{" "}
              {artisanStats.placesEnabled ? "clé OK" : "non configuré"}
              {artisanStats.quota.enrichmentPaused ? " · pause enrichissement" : ""}
            </div>
            <div>Report : {artisanStats.quota.enrichmentCarryover}</div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">Chargement stats artisans…</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runSireneExtract}
            disabled={disableWhen(Boolean(artisanBusy))}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {artisanBusy === "sirene" ? "Extraction…" : "Extraire SIRENE (batch)"}
          </button>
          <button
            type="button"
            onClick={runPlacesEnrich}
            disabled={disableWhen(
              Boolean(artisanBusy) || artisanStats?.placesEnabled === false
            )}
            title={
              artisanStats?.placesEnabled === false
                ? "Active GOOGLE_PLACES_ENABLED=true + clé API en prod pour tester"
                : undefined
            }
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 disabled:opacity-50"
          >
            {artisanBusy === "places" ? "Enrichissement…" : "Lancer enrichissement Places"}
          </button>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            Boost
            <input
              type="number"
              min={1}
              max={2000}
              step={10}
              value={placesBoost}
              onChange={(e) => setPlacesBoost(e.target.value)}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={() => void boostPlacesQuota()}
            disabled={disableWhen(
              Boolean(artisanBusy) || artisanStats?.placesEnabled === false
            )}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 disabled:opacity-50"
            title="Augmente exceptionnellement le budget Places d'aujourd'hui"
          >
            {artisanBusy === "places-boost" ? "Boost…" : "Augmenter budget jour"}
          </button>
          <button
            type="button"
            onClick={loadArtisanStats}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
          >
            Rafraîchir stats
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-semibold text-slate-900">Réglages</h2>
        {!settings && loading && (
          <p className="mt-3 text-slate-500">Chargement des réglages…</p>
        )}
        {!settings && !loading && (
          <p className="mt-3 text-amber-700">Réglages indisponibles.</p>
        )}
        {settings && (
          <>
            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.requireReviewBeforeSend !== false}
                onChange={(e) =>
                  saveSettings({ requireReviewBeforeSend: e.target.checked })
                }
              />
              Exiger validation admin avant tout envoi OVH (recommandé)
            </label>
            <p className="mt-2 text-xs text-slate-500">
              Un seul lot par demande : pas de relances SMS tant que les
              places de contact ne sont pas pleines. Cochez « Prêt à partir »
              pour l’envoi à 8h, ou envoyez à la main.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                Throttle (ms)
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={settings.throttleMs}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      throttleMs: Number(e.target.value) || 0,
                    })
                  }
                  onBlur={() => saveSettings({ throttleMs: settings.throttleMs })}
                  className="w-24 rounded border border-slate-300 px-2 py-1"
                />
              </label>
            </div>
          </>
        )}
      </section>
      </>
      )}

      {tab === "launch" && (
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <PlacesFreeQuotaCard stats={artisanStats} />
        <h2 className="mt-5 text-lg font-semibold">Lancer une campagne</h2>
        <p className="mt-1 text-xs text-slate-500">
          Un lot unique : prévisualisez, cochez, préparez. Pas de vagues
          suivantes jusqu’à 5/5. Envoi à 8h si « Prêt à partir », ou tout de
          suite. STOP + lun–sam 8h–20h Paris.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="workRequest" className="mb-1 block text-sm font-medium text-slate-700">
              Demande de travaux
            </label>
            <select
              id="workRequest"
              value={selectedId}
              disabled={disableWhen(loading)}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setPreview(null);
                setMessage("");
                setSelectedSirets(new Set());
                setError(null);
                setSuccess(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              <option value="">
                {loading ? "— Chargement des demandes… —" : "— Choisir une demande —"}
              </option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.category} · {r.city} ({r.department}) · {r.status}
                  {r.companyName ? ` · ${r.companyName}` : ""}
                  {r.auctionId ? " · offre" : ""}
                </option>
              ))}
            </select>
            {!loading && requests.length === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Aucune demande pending/approved dans le store. Créez ou approuvez une
                demande pour lancer une campagne.
              </p>
            )}

            <label className="mt-3 mb-1 block text-sm font-medium text-slate-700">
              Volume du lot
            </label>
            <p className="mb-1 text-xs text-slate-500">
              Nombre de SMS du lot (modifiable). Défaut client : 5 × artisans
              {selectedRequest
                ? ` → 5 × ${maxForSelected} = ${selectedRequest.smsQuota ?? maxForSelected * 5}`
                : ""}
              . Les cases cochées partent toutes, même au-delà de ce défaut.
            </p>
            <input
              type="number"
              min={1}
              max={200}
              value={campaignSize}
              onChange={(e) => setCampaignSize(Number(e.target.value) || 1)}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={handlePreview}
              disabled={disableWhen(!selectedId || previewLoading || loading)}
              className="mt-3 block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {previewLoading
                ? "SIRENE + BODACC, puis Places si besoin…"
                : "Prévisualiser les numéros"}
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            {previewLoading && (
              <LoadingBar label="Filtre gratuit (SIRENE, activité, BODACC) puis Places pour note et mobile…" />
            )}
            {!previewLoading && !preview && (
              <p className="text-slate-500">
                Sélectionnez une demande puis lancez la prévisualisation. La liste
                complète (avec et sans téléphone) s&apos;affichera ici.
              </p>
            )}
            {preview && selectedByCohort && !previewLoading && (
              <>
                <p className="font-medium text-slate-900">
                  Résumé du lot
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li>
                    <strong>{preview.candidates.filter((c) => c.selectedByDefault).length}</strong>
                    /{preview.campaignSize} mobiles trouvés
                    {(preview.shortfall ?? 0) > 0
                      ? ` · manque ${preview.shortfall}`
                      : ""}
                    {preview.radiusKm
                      ? ` · rayon ${preview.radiusKm} km`
                      : ""}
                  </li>
                  <li>
                    <strong>{selectedCount}</strong> destinataire
                    {selectedCount > 1 ? "s" : ""} sélectionné
                    {selectedCount > 1 ? "s" : ""}
                  </li>
                  <li>
                    {preview.candidates.length} joignables ·{" "}
                    {preview.withoutPhone.length} sans téléphone ·{" "}
                    {excludedCount} exclus
                    {(preview.bodaccExcluded ?? 0) > 0
                      ? ` dont ${preview.bodaccExcluded} BODACC`
                      : ""}
                  </li>
                  <li>
                    Artisans demandés par le client :{" "}
                    <strong>
                      {preview.artisansWanted ?? maxForSelected}
                    </strong>
                    {" · "}
                    volume choisi :{" "}
                    <strong>{preview.campaignSize}</strong> SMS
                    {" · "}défaut client {(preview.smsPerArtisan ?? 5)} ×{" "}
                    {preview.artisansWanted ?? maxForSelected}
                  </li>
                  <li>
                    Contacts déjà débloqués :{" "}
                    <strong>
                      {acceptedForSelected}/{maxForSelected}
                    </strong>
                  </li>
                  <li>
                    Mode :{" "}
                    <strong>
                      {reviewBeforeSend
                        ? "sera préparé pour validation (pas d’OVH immédiat)"
                        : "envoi immédiat si OVH configuré"}
                    </strong>
                  </li>
                </ul>
                {selectedCount > 0 && (
                  <p className="mt-3 break-all font-mono text-xs text-slate-800">
                    {preview.candidates
                      .filter((c) => selectedSirets.has(c.siret))
                      .map((c) => c.phone)
                      .join(", ")}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Cible âge : {preview.suggestedCounts.new_young} ×{" "}
                  {COMPANY_AGE_YOUNG_SHORT} /{" "}
                  {preview.suggestedCounts.new_established} ×{" "}
                  {COMPANY_AGE_ESTABLISHED_SHORT}
                  {preview.preferEstablishedCompany === true
                    ? ` (client : uniquement ${COMPANY_AGE_ESTABLISHED_SHORT})`
                    : preview.preferEstablishedCompany === false
                      ? ` (client : uniquement ${COMPANY_AGE_YOUNG_SHORT})`
                      : " (pas de filtre âge)"}
                  {preview.requireRge ? " · client : uniquement RGE" : ""}
                  {" · "}sélection actuelle : {selectedByCohort.new_young} /{" "}
                  {selectedByCohort.new_established}
                  {!preview.geoFound ? " · géo approximative" : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectSuggested}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Proposition auto
                  </button>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Tout garder (avec tél)
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Tout écarter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {previewLoading && (
          <div className="mt-6">
            <LoadingBar label="Chargement de la liste entreprises (peut prendre plusieurs secondes)…" />
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <div className="animate-pulse space-y-2 bg-white p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 rounded bg-slate-100" />
                ))}
              </div>
            </div>
          </div>
        )}

        {preview && !previewLoading && (
          <>
            <div className="mt-6 overflow-x-auto">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Toutes les entreprises trouvées ({allRows.length})
              </h3>
              {allRows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Aucune entreprise proche pour cette catégorie / ville. Vérifiez la
                  catégorie NAF ou élargissez le rayon.
                </p>
              ) : (
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-2">OK</th>
                      <th className="py-2 pr-2">Statut</th>
                      <th className="py-2 pr-2">Entreprise</th>
                      <th className="py-2 pr-2">SIRET</th>
                      <th className="py-2 pr-2">Ville</th>
                      <th className="py-2 pr-2">Cohorte</th>
                      <th className="py-2 pr-2">Note Google</th>
                      <th className="py-2 pr-2">BODACC</th>
                      <th className="py-2 pr-2">Téléphone</th>
                      <th className="py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((item) => {
                      if (item.kind === "ready") {
                        const c = item.candidate;
                        return (
                          <tr key={c.siret} className="border-b border-slate-100">
                            <td className="py-2 pr-2">
                              <input
                                type="checkbox"
                                checked={selectedSirets.has(c.siret)}
                                onChange={() => toggleSiret(c.siret)}
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
                                Joignable
                              </span>
                            </td>
                            <td className="py-2 pr-2 font-medium text-slate-800">
                              {c.companyName}
                            </td>
                            <td className="py-2 pr-2 font-mono text-slate-600">
                              {c.siret}
                            </td>
                            <td className="py-2 pr-2">{c.city}</td>
                            <td className="py-2 pr-2">{COHORT_LABELS[c.cohort]}</td>
                            <td className={`py-2 pr-2 tabular-nums ${formatGoogleRating(c.googleRating, c.googleUserRatingCount).className}`}>
                              {formatGoogleRating(c.googleRating, c.googleUserRatingCount).text}
                            </td>
                            <td className="py-2 pr-2">
                              <span className={formatBodaccStatus(c.bodaccStatus, c.bodaccNature).className}>
                                {formatBodaccStatus(c.bodaccStatus, c.bodaccNature).text}
                              </span>
                            </td>
                            <td className="py-2 pr-2">{c.phone}</td>
                            <td className="py-2">{c.source}</td>
                          </tr>
                        );
                      }

                      const row = item.row;
                      const saving = savingPhone === row.siret;
                      return (
                        <tr key={row.siret} className="border-b border-slate-100 bg-amber-50/40">
                          <td className="py-2 pr-2 text-slate-300">—</td>
                          <td className="py-2 pr-2">
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
                              {saving ? "Enregistrement…" : "Sans téléphone"}
                            </span>
                          </td>
                          <td className="py-2 pr-2 font-medium text-slate-800">
                            {row.companyName}
                          </td>
                          <td className="py-2 pr-2 font-mono text-slate-600">
                            {row.siret}
                          </td>
                          <td className="py-2 pr-2">{row.city}</td>
                          <td className="py-2 pr-2 text-slate-400">—</td>
                          <td className={`py-2 pr-2 tabular-nums ${formatGoogleRating(row.googleRating, row.googleUserRatingCount).className}`}>
                            {formatGoogleRating(row.googleRating, row.googleUserRatingCount).text}
                          </td>
                          <td className="py-2 pr-2">
                            <span className={formatBodaccStatus(row.bodaccStatus, row.bodaccNature).className}>
                              {formatBodaccStatus(row.bodaccStatus, row.bodaccNature).text}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex flex-wrap items-center gap-1">
                              <input
                                type="tel"
                                placeholder="06…"
                                value={phoneDrafts[row.siret] ?? ""}
                                onChange={(e) =>
                                  setPhoneDrafts((d) => ({
                                    ...d,
                                    [row.siret]: e.target.value,
                                  }))
                                }
                                className="w-28 rounded border border-slate-300 px-2 py-1"
                              />
                              <button
                                type="button"
                                disabled={saving || !(phoneDrafts[row.siret] ?? "").trim()}
                                onClick={() => savePhone(row)}
                                className="rounded bg-slate-800 px-2 py-1 text-white disabled:opacity-50"
                              >
                                {saving ? "…" : "OK"}
                              </button>
                            </div>
                          </td>
                          <td className="py-2">{row.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <p className="mt-2 text-[11px] text-slate-500">
                Note Google : issue de Places. BODACC : scan local + contrôle
                API des joignables. OK = pas de procédure collective active.
                {preview.minGoogleRating != null
                  ? ` Seuil client : uniquement les fiches avec une note affichée ≥ ${String(preview.minGoogleRating).replace(".", ",")}/5.`
                  : ""}
              </p>
            </div>

            <div className="mt-4">
              <label htmlFor="smsMessage" className="mb-1 block text-sm font-medium text-slate-700">
                Message SMS
              </label>
              <textarea
                id="smsMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={640}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                {message.length}/640 · {smsCost.credits} crédit
                {smsCost.credits > 1 ? "s" : ""}/SMS
                {smsCost.unicode ? " (caractère hors SMS, ex. ê)" : ""} ·{" "}
                {selectedCount} destinataire
                {selectedCount > 1 ? "s" : ""} ·{" "}
                <a
                  href={preview.auctionUrl}
                  className="text-brand-700 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Lien annonce
                </a>
              </p>

              {sending && (
                <div className="mt-3">
                  <LoadingBar label="Préparation / envoi du lot…" />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStartCampaign(false)}
                  disabled={disableWhen(
                    sending || !selectedId || selectedSirets.size === 0
                  )}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {sending
                    ? "Traitement…"
                    : reviewBeforeSend
                      ? "Préparer le lot"
                      : "Envoyer le lot"}
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCampaign(true)}
                  disabled={disableWhen(
                    sending ||
                      !demoAllowed ||
                      !selectedId ||
                      selectedSirets.size === 0
                  )}
                  title={
                    !demoAllowed
                      ? "Simulation désactivée quand OVH SMS est actif en production"
                      : undefined
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {demoAllowed ? "Simuler (démo)" : "Simulation indisponible"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Les cases cochées = les SMS du lot (tu peux en mettre plus que
                le défaut client). Un seul envoi.
              </p>
            </div>
          </>
        )}

        {!preview && selectedId && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              Prévisualisez d&apos;abord le lot pour choisir les destinataires.
              Sinon vous pouvez démarrer avec la sélection automatique.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleStartCampaign(false)}
                disabled={disableWhen(sending)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {reviewBeforeSend
                  ? "Préparer sans prévisualiser"
                  : "Envoyer sans prévisualiser"}
              </button>
              <button
                type="button"
                onClick={() => handleStartCampaign(true)}
                disabled={disableWhen(sending || !demoAllowed)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Simuler sans prévisualiser
              </button>
            </div>
          </div>
        )}
      </section>
      )}

      {tab === "todo" && (
      <section className="mt-6">
        <h2 className="text-lg font-semibold">
          Lots à valider
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Préparés sans OVH. Cochez « Prêt à partir » pour l’envoi auto à 8h
          (lun–sam), ou envoyez tout de suite.
        </p>
        {pendingReview.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Aucun lot en attente. Préparez un lot depuis Lancer, puis cochez
            Prêt à partir si vous voulez l’envoi à 8h.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pendingReview.map((batch) => (
              <li
                key={batch.id}
                className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {batch.category} · {batch.city} ({batch.department})
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {batch.recipientCount} destinataire
                      {batch.recipientCount > 1 ? "s" : ""} · préparé{" "}
                      {new Date(batch.createdAt).toLocaleString("fr-FR")}
                      {batch.autoSend
                        ? " · prêt à partir à 8h"
                        : ""}
                    </p>
                    <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-800">
                      <input
                        type="checkbox"
                        checked={batch.autoSend === true}
                        disabled={disableWhen(sending)}
                        onChange={(e) =>
                          void handleToggleAutoSend(batch.id, e.target.checked)
                        }
                      />
                      Prêt à partir — envoi auto à 8h (lun–sam)
                    </label>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-700">
                      {batch.recipients.map((r, i) => (
                        <li key={`${r.siret ?? r.phone}-${i}`}>
                          {r.companyName} · {r.phone}
                          {r.siret ? ` · ${r.siret}` : ""}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-600">{batch.message}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={disableWhen(sending || !smsConfigured)}
                      onClick={() => handleApproveBatch(batch.id, false)}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Envoyer le lot
                    </button>
                    <button
                      type="button"
                      disabled={disableWhen(sending || !demoAllowed)}
                      onClick={() => handleApproveBatch(batch.id, true)}
                      className="rounded border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      Simuler (démo)
                    </button>
                    <button
                      type="button"
                      disabled={disableWhen(sending)}
                      onClick={() => handleDiscardBatch(batch.id)}
                      className="rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {tab === "track" && (
      <>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Campagnes en cours</h2>
        {loading ? (
          <div className="mt-4">
            <LoadingBar label="Chargement des campagnes…" />
          </div>
        ) : acquisitions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Aucune campagne pour l&apos;instant.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {acquisitions.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {a.category ?? "Demande"} · {a.city ?? "—"} (
                      {a.department ?? "—"})
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ACQ_STATUS_LABELS[a.status]} · contacts{" "}
                      {a.acceptedCount}/{a.maxAccepted} · SMS{" "}
                      {a.totalSent}/{a.smsQuota ?? a.smsPerDay}
                      {(a.remainingSms ?? 0) > 0
                        ? ` · reste ${a.remainingSms}`
                        : ""}{" "}
                      · {a.trigger}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.status === "active" && (
                      <button
                        type="button"
                        disabled={disableWhen(sending)}
                        onClick={() => handleAcquisitionAction(a.id, "pause")}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        Pause
                      </button>
                    )}
                    {a.status === "paused" && (
                      <button
                        type="button"
                        disabled={disableWhen(sending)}
                        onClick={() => handleAcquisitionAction(a.id, "resume")}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        Reprendre
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Historique des lots</h2>
        <p className="mt-1 text-xs text-slate-500">Lots déjà envoyés, simulés ou annulés.</p>
        {loading ? (
          <div className="mt-4">
            <LoadingBar label="Chargement de l’historique des campagnes…" />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Aucune campagne envoyée pour l’instant.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {c.category} · {c.city} ({c.department})
                      {c.trigger ? ` · ${c.trigger}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(c.sentAt ?? c.createdAt).toLocaleString("fr-FR")} ·{" "}
                      {c.sentCount}/{c.recipientCount} envoyés
                      {c.failedCount > 0 && ` · ${c.failedCount} échec(s)`}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{c.message}</p>
                <Link
                  href={`/admin/campagnes-sms?request=${c.workRequestId}`}
                  onClick={() => {
                    setSelectedId(c.workRequestId);
                    setPreview(null);
                    setTab("launch");
                  }}
                  className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
                >
                  Rouvrir dans Lancer
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      </>
      )}
    </div>
  );
}
