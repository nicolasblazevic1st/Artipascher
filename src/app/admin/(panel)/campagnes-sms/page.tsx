"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  geoFound: boolean;
  totalNearby: number;
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

export default function AdminSmsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [requests, setRequests] = useState<WorkRequestOption[]>([]);
  const [settings, setSettings] = useState<SmsCampaignSettings | null>(null);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sms-campaigns");
    const data = await res.json();
    if (res.ok) {
      setCampaigns(data.campaigns ?? []);
      setRequests(data.requests ?? []);
      setSettings(data.settings ?? null);
      setCampaignSize(data.settings?.defaultCampaignSize ?? 30);
      setSmsConfigured(data.smsConfigured === true);
      setDemoAllowed(data.demoAllowed === true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("request");
    if (requestId) setSelectedId(requestId);
  }, [load]);

  async function handlePreview() {
    if (!selectedId) return;
    setPreviewLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch(
      `/api/admin/sms-campaigns/preview?workRequestId=${encodeURIComponent(selectedId)}&campaignSize=${campaignSize}`
    );
    const data = await res.json();
    setPreviewLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Aperçu impossible.");
      setPreview(null);
      return;
    }

    const p = data.preview as Preview;
    setPreview(p);
    setMessage(p.defaultMessage);
    setSelectedSirets(
      new Set(p.candidates.filter((c) => c.selectedByDefault).map((c) => c.siret))
    );
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
    setSending(false);

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
  }

  async function saveSettings(patch: Partial<SmsCampaignSettings>) {
    const res = await fetch("/api/admin/sms-campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) setSettings(data.settings);
  }

  async function savePhone(row: Preview["withoutPhone"][number]) {
    const phone = phoneDrafts[row.siret]?.trim();
    if (!phone) return;
    setSavingPhone(row.siret);
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
    setSavingPhone(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Enregistrement téléphone impossible.");
      return;
    }
    await handlePreview();
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

  return (
    <div>
      <h1 className="text-2xl font-bold">Campagnes SMS</h1>
      <p className="mt-1 text-sm text-slate-600">
        Contrôle total : choisissez l&apos;offre, le nombre de SMS, les entreprises à
        garder ou écarter, puis envoyez.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            smsConfigured
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {smsConfigured ? "OVH SMS configuré" : "OVH SMS non configuré"}
        </span>
        {demoAllowed && (
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            Mode démo disponible
          </span>
        )}
      </div>

      {settings && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold text-slate-900">Réglages</h2>
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
        </section>
      )}

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
              onChange={(e) => {
                setSelectedId(e.target.value);
                setPreview(null);
                setMessage("");
                setSelectedSirets(new Set());
                setError(null);
                setSuccess(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Choisir une demande —</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.category} · {r.city} ({r.department}) · {r.status}
                  {r.companyName ? ` · ${r.companyName}` : ""}
                  {r.auctionId ? " · enchère" : ""}
                </option>
              ))}
            </select>

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
              disabled={!selectedId || previewLoading}
              className="mt-3 block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {previewLoading ? "Calcul…" : "Prévisualiser le mix & la liste"}
            </button>
          </div>

          {preview && selectedByCohort && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-900">
                {selectedCount} SMS sélectionné{selectedCount > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Proposition mix : {preview.suggestedCounts.returning} déjà /{" "}
                {preview.suggestedCounts.new_young} &lt;2 ans /{" "}
                {preview.suggestedCounts.new_established} ≥2 ans · sélection actuelle :{" "}
                {selectedByCohort.returning} / {selectedByCohort.new_young} /{" "}
                {selectedByCohort.new_established}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {preview.candidates.length} joignables · {preview.withoutPhone.length} sans
                téléphone · {preview.totalNearby} proches SIRENE
                {preview.geoFound ? "" : " (géo approximative)"}
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
                  Tout garder
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded border border-slate-300 px-2 py-1 text-xs"
                >
                  Tout écarter
                </button>
              </div>
            </div>
          )}
        </div>

        {preview && (
          <>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-2">OK</th>
                    <th className="py-2 pr-2">Entreprise</th>
                    <th className="py-2 pr-2">SIRET</th>
                    <th className="py-2 pr-2">Ville</th>
                    <th className="py-2 pr-2">Cohorte</th>
                    <th className="py-2 pr-2">Tél</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.candidates.map((c) => (
                    <tr key={c.siret} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedSirets.has(c.siret)}
                          onChange={() => toggleSiret(c.siret)}
                        />
                      </td>
                      <td className="py-2 pr-2 font-medium text-slate-800">
                        {c.companyName}
                      </td>
                      <td className="py-2 pr-2 font-mono text-slate-600">{c.siret}</td>
                      <td className="py-2 pr-2">{c.city}</td>
                      <td className="py-2 pr-2">{COHORT_LABELS[c.cohort]}</td>
                      <td className="py-2 pr-2">{c.phone}</td>
                      <td className="py-2">{c.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.withoutPhone.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-800">
                  Sans téléphone (hors envoi) — enrichir le carnet
                </h3>
                <ul className="mt-2 space-y-2">
                  {preview.withoutPhone.slice(0, 20).map((row) => (
                    <li
                      key={row.siret}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-medium">{row.companyName}</span>
                      <span className="text-slate-500">{row.siret}</span>
                      <input
                        type="tel"
                        placeholder="06…"
                        value={phoneDrafts[row.siret] ?? ""}
                        onChange={(e) =>
                          setPhoneDrafts((d) => ({ ...d, [row.siret]: e.target.value }))
                        }
                        className="w-32 rounded border border-slate-300 px-2 py-1"
                      />
                      <button
                        type="button"
                        disabled={savingPhone === row.siret}
                        onClick={() => savePhone(row)}
                        className="rounded bg-slate-800 px-2 py-1 text-white disabled:opacity-50"
                      >
                        Enregistrer
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSend(false)}
                  disabled={
                    sending || selectedCount === 0 || !smsConfigured || !message.trim()
                  }
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {sending ? "Envoi…" : `Envoyer ${selectedCount} SMS`}
                </button>
                {demoAllowed && (
                  <button
                    type="button"
                    onClick={() => handleSend(true)}
                    disabled={sending || selectedCount === 0 || !message.trim()}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Simuler (démo)
                  </button>
                )}
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
          <p className="mt-4 text-sm text-slate-500">Chargement…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Aucune campagne envoyée.
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
