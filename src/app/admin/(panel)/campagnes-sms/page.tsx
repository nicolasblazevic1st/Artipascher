"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SmsCampaign } from "@/lib/store-types";

interface WorkRequestOption {
  id: string;
  category: string;
  city: string;
  department: string;
  status: string;
  firstName: string;
  lastName: string;
  auctionId?: string;
  createdAt: string;
}

interface Preview {
  workRequestId: string;
  category: string;
  city: string;
  department: string;
  clientLabel: string;
  auctionUrl: string;
  defaultMessage: string;
  recipients: Array<{
    proId?: string;
    companyName: string;
    phone: string;
    city: string;
  }>;
  geoFound: boolean;
  totalNearby: number;
}

const STATUS_LABELS: Record<SmsCampaign["status"], string> = {
  sent: "Envoyée",
  demo: "Mode démo",
  failed: "Échec partiel",
};

export default function AdminSmsCampaignsPage() {
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [requests, setRequests] = useState<WorkRequestOption[]>([]);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/sms-campaigns");
    const data = await res.json();
    if (res.ok) {
      setCampaigns(data.campaigns ?? []);
      setRequests(data.requests ?? []);
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
      `/api/admin/sms-campaigns/preview?workRequestId=${encodeURIComponent(selectedId)}`
    );
    const data = await res.json();
    setPreviewLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Aperçu impossible.");
      setPreview(null);
      return;
    }

    setPreview(data.preview);
    setMessage(data.preview.defaultMessage);
  }

  async function handleSend(demo = false) {
    if (!selectedId || !message.trim()) return;
    setSending(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/admin/sms-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workRequestId: selectedId, message, demo }),
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

  return (
    <div>
      <h1 className="text-2xl font-bold">Campagnes SMS</h1>
      <p className="mt-1 text-sm text-slate-600">
        Alertez les artisans inscrits proches d&apos;une demande de travaux particulier.
        Les SMS ciblent les pros Artipascher avec numéro connu (pas les clients).
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
                setError(null);
                setSuccess(null);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Choisir une demande —</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.category} · {r.city} ({r.department}) · {r.status}
                  {r.auctionId ? " · enchère" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!selectedId || previewLoading}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {previewLoading ? "Calcul…" : "Prévisualiser les destinataires"}
            </button>
          </div>

          {preview && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-900">
                {preview.recipients.length} artisan
                {preview.recipients.length > 1 ? "s" : ""} joignable
                {preview.recipients.length > 1 ? "s" : ""} par SMS
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {preview.totalNearby} entreprises à proximité
                {preview.geoFound ? "" : " (géolocalisation approximative)"}
              </p>
              <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto text-xs text-slate-700">
                {preview.recipients.map((r) => (
                  <li key={`${r.proId ?? r.phone}-${r.companyName}`}>
                    {r.companyName} · {r.city} · {r.phone}
                  </li>
                ))}
              </ul>
              {preview.recipients.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  Aucun artisan inscrit avec mobile dans la zone. Invitez des pros ou
                  attendez de nouvelles inscriptions.
                </p>
              )}
            </div>
          )}
        </div>

        {preview && (
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
              {message.length}/640 caractères · Lien enchère :{" "}
              <a
                href={preview.auctionUrl}
                className="text-brand-700 underline"
                target="_blank"
                rel="noreferrer"
              >
                {preview.auctionUrl}
              </a>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSend(false)}
                disabled={sending || preview.recipients.length === 0 || !smsConfigured}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {sending ? "Envoi…" : "Envoyer la campagne"}
              </button>
              {demoAllowed && (
                <button
                  type="button"
                  onClick={() => handleSend(true)}
                  disabled={sending || preview.recipients.length === 0}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Simuler (démo)
                </button>
              )}
            </div>
            {!smsConfigured && (
              <p className="mt-2 text-xs text-amber-700">
                Configurez OVH_SMS_* dans .env pour un envoi réel, ou utilisez la simulation.
              </p>
            )}
          </div>
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
                  href="/admin/demandes"
                  className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline"
                >
                  Demande {c.workRequestId}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
