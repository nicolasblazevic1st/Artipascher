"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAdminJson } from "@/lib/admin-fetch-json";
import type { SmsCampaign, SmsCampaignSettings, SmsCohort } from "@/lib/store-types";

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
}

interface Preview {
  workRequestId: string;
  category: string;
  city: string;
  department: string;
  auctionUrl: string;
  defaultMessage: string;
  campaignSize: number;
  preferEstablishedCompany?: boolean;
  geoFound: boolean;
  totalNearby: number;
  gouvCount: number;
  platformCount: number;
  cohortCounts: Record<SmsCohort, number>;
  suggestedCounts: Record<SmsCohort, number>;
  candidates: Candidate[];
  withoutPhone: Array<{
    siret: string;
    companyName: string;
    city: string;
    companyCreatedAt?: string;
    source: string;
  }>;
}

type ListRow =
  | { kind: "ready"; candidate: Candidate }
  | {
      kind: "no_phone";
      row: Preview["withoutPhone"][number];
    };

const COHORT_LABELS: Record<SmsCohort, string> = {
  returning: "Déjà contactés",
  new_young: "< 2 ans",
  new_established: "≥ 2 ans",
};

const STATUS_LABELS: Record<SmsCampaign["status"], string> = {
  sent: "Envoyée",
  demo: "Mode démo",
  failed: "Échec partiel",
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

export default function AdminSmsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [requests, setRequests] = useState<WorkRequestOption[]>([]);
  const [settings, setSettings] = useState<SmsCampaignSettings | null>(null);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState(false);
  // false au 1er rendu (SSR = client) pour éviter mismatch hydration sur disabled
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [campaignSize, setCampaignSize] = useState(30);
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
  } | null>(null);
  const [artisanBusy, setArtisanBusy] = useState<string | null>(null);
  const [placesBoost, setPlacesBoost] = useState("100");
  const [mounted, setMounted] = useState(false);

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
      setRequests(data.requests ?? []);
      setSettings(data.settings ?? null);
      setCampaignSize(data.settings?.defaultCampaignSize ?? 30);
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
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("request");
    if (requestId) setSelectedId(requestId);
  }, [load, loadArtisanStats]);

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
        new Set(p.candidates.filter((c) => c.selectedByDefault).map((c) => c.siret))
      );
    } catch {
      setError("Erreur réseau pendant la prévisualisation (SIRENE / géocodage).");
    } finally {
      setPreviewLoading(false);
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

  function selectAll() {
    if (!preview) return;
    setSelectedSirets(new Set(preview.candidates.map((c) => c.siret)));
  }

  function selectSuggested() {
    if (!preview) return;
    setSelectedSirets(
      new Set(preview.candidates.filter((c) => c.selectedByDefault).map((c) => c.siret))
    );
  }

  function clearSelection() {
    setSelectedSirets(new Set());
  }

  async function handleSend(demo = false) {
    if (!selectedId || !message.trim() || selectedSirets.size === 0) return;
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/sms-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workRequestId: selectedId,
          message,
          demo,
          recipientSirets: Array.from(selectedSirets),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Envoi impossible.");
        return;
      }

      const c = data.campaign as SmsCampaign;
      setSuccess(
        demo
          ? `Campagne simulée : ${c.sentCount}/${c.recipientCount} SMS (mode démo).`
          : `Campagne envoyée : ${c.sentCount}/${c.recipientCount} SMS.`
      );
      await load();
    } catch {
      setError("Erreur réseau pendant l’envoi.");
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
    return [
      ...preview.candidates.map((candidate) => ({ kind: "ready" as const, candidate })),
      ...preview.withoutPhone.map((row) => ({ kind: "no_phone" as const, row })),
    ];
  }, [preview]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Campagnes SMS</h1>
      <p className="mt-1 text-sm text-slate-600">
        Contrôle total : choisissez l&apos;offre, le nombre de SMS, les entreprises à
        garder ou écarter, puis envoyez. SIRENE n&apos;envoie pas les téléphones —
        enrichissez-les ici pour les rendre sélectionnables.
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
            ? "Mode démo : chargement…"
            : demoAllowed
              ? "Mode démo disponible"
              : "Mode démo indisponible (OVH_SMS_ENABLED=true en prod)"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          {loading
            ? "Demandes : …"
            : `${requests.length} demande${requests.length !== 1 ? "s" : ""} éligible${requests.length !== 1 ? "s" : ""}`}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          {loading
            ? "Campagnes : …"
            : `${campaigns.length} campagne${campaigns.length !== 1 ? "s" : ""} en historique`}
        </span>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-semibold text-slate-900">
          Base artisans (SIRENE + Google Places)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {artisanStats?.placesEnabled
            ? "Places activé. Prévisualise une campagne pour enregistrer les SIRENE dans la base, puis lance l’enrichissement (consomme le quota)."
            : <>
                Places désactivé tant que{" "}
                <code className="rounded bg-slate-100 px-1">GOOGLE_PLACES_ENABLED=true</code>{" "}
                n&apos;est pas posé.
              </>}
          {" "}Les 67 « sans téléphone » de la preview ne sont enrichis qu&apos;après
          enregistrement en base (preview ou Extraire SIRENE).
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
                {artisanStats.quota.requestsProduction +
                  artisanStats.quota.requestsEnrichment}
                /{artisanStats.quota.monthlyLimit}
              </strong>{" "}
              (reste {artisanStats.remaining})
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
                checked={settings.autoSendOnApprove}
                onChange={(e) =>
                  saveSettings({ autoSendOnApprove: e.target.checked })
                }
              />
              Envoi auto à l&apos;approbation d&apos;une offre (déconseillé au démarrage)
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                N par défaut
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={settings.defaultCampaignSize}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultCampaignSize: Number(e.target.value) || 30,
                    })
                  }
                  onBlur={() =>
                    saveSettings({ defaultCampaignSize: settings.defaultCampaignSize })
                  }
                  className="w-20 rounded border border-slate-300 px-2 py-1"
                />
              </label>
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

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Nouvelle campagne</h2>

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
                  {r.auctionId ? " · enchère" : ""}
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
              Nombre max suggéré (N)
            </label>
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
              {previewLoading ? "Calcul SIRENE en cours…" : "Prévisualiser le mix & la liste"}
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            {previewLoading && (
              <LoadingBar label="Recherche SIRENE + artisans plateforme + carnet prospects…" />
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
                  {selectedCount} SMS sélectionné{selectedCount > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Proposition mix
                  {preview.preferEstablishedCompany
                    ? " (préférence client ≥2 ans → 2/3 établis / 1/3 jeunes)"
                    : ""}{" "}
                  : {preview.suggestedCounts.returning} déjà /{" "}
                  {preview.suggestedCounts.new_young} &lt;2 ans /{" "}
                  {preview.suggestedCounts.new_established} ≥2 ans · sélection actuelle :{" "}
                  {selectedByCohort.returning} / {selectedByCohort.new_young} /{" "}
                  {selectedByCohort.new_established}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {preview.candidates.length} joignables · {preview.withoutPhone.length}{" "}
                  sans téléphone · {preview.gouvCount} SIRENE · {preview.platformCount}{" "}
                  plateforme · {preview.totalNearby} au total
                  {preview.geoFound ? "" : " (géo approximative / introuvable)"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectSuggested}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    Proposition mix
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
                {message.length}/640 · {selectedCount} destinataire
                {selectedCount > 1 ? "s" : ""} ·{" "}
                <a
                  href={preview.auctionUrl}
                  className="text-brand-700 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Lien enchère
                </a>
              </p>

              {sending && (
                <div className="mt-3">
                  <LoadingBar
                    label={`Envoi en cours (${selectedCount} destinataire${selectedCount > 1 ? "s" : ""})…`}
                  />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSend(false)}
                  disabled={disableWhen(
                    sending || selectedCount === 0 || !smsConfigured || !message.trim()
                  )}
                  title={
                    !smsConfigured
                      ? "OVH SMS non configuré"
                      : selectedCount === 0
                        ? "Sélectionnez au moins une entreprise joignable"
                        : undefined
                  }
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {sending ? "Envoi…" : `Envoyer ${selectedCount} SMS`}
                </button>
                <button
                  type="button"
                  onClick={() => handleSend(true)}
                  disabled={disableWhen(
                    sending ||
                      !demoAllowed ||
                      selectedCount === 0 ||
                      !message.trim()
                  )}
                  title={
                    !demoAllowed
                      ? "Mode démo désactivé quand OVH SMS est actif en production"
                      : undefined
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {demoAllowed ? "Simuler (démo)" : "Simuler (démo indisponible)"}
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {success}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Historique</h2>
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
                  className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
                >
                  Rouvrir la demande
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
