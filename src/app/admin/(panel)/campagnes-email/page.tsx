"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readAdminJson } from "@/lib/admin-fetch-json";
import { WORK_CATEGORIES } from "@/lib/work-categories";

type Audience = "platform" | "work_request" | "csv";

interface WorkRequestOption {
  id: string;
  category: string;
  city: string;
  department: string;
  status: string;
  auctionId?: string;
  createdAt: string;
}

interface Recipient {
  email: string;
  companyName: string;
  siret?: string;
  city?: string;
  department?: string;
}

interface Preview {
  audience: Audience;
  subject: string;
  bodyText: string;
  recipients: Recipient[];
  optedOutSkipped: number;
}

interface CampaignRow {
  id: string;
  subject: string;
  status: string;
  audience: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
}

interface SmsStatus {
  ovhConfigured: boolean;
  brevoConfigured: boolean;
  canSend: boolean;
  ovhCreditsLeft: number | null;
}

const AUDIENCE_LABELS: Record<Audience, string> = {
  platform: "Artisans inscrits",
  work_request: "Inscrits liés à une demande",
  csv: "Liste / CSV",
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminEmailCampaignsPage() {
  const [audience, setAudience] = useState<Audience>("platform");
  const [department, setDepartment] = useState<"all" | "59" | "62">("all");
  const [category, setCategory] = useState("");
  const [workRequestId, setWorkRequestId] = useState("");
  const [csv, setCsv] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [requests, setRequests] = useState<WorkRequestOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [configured, setConfigured] = useState(false);
  const [demoAllowed, setDemoAllowed] = useState(false);
  const [sms, setSms] = useState<SmsStatus | null>(null);
  const [optOutCount, setOptOutCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-campaigns");
      const data = await readAdminJson<{
        campaigns?: CampaignRow[];
        requests?: WorkRequestOption[];
        marketingEmailConfigured?: boolean;
        demoAllowed?: boolean;
        sms?: SmsStatus;
        optOutCount?: number;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible.");
      setCampaigns(data.campaigns ?? []);
      setRequests(data.requests ?? []);
      setConfigured(data.marketingEmailConfigured === true);
      setDemoAllowed(data.demoAllowed === true);
      setSms(data.sms ?? null);
      setOptOutCount(data.optOutCount ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/email-campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          department,
          category: category || undefined,
          workRequestId:
            audience === "work_request" ? workRequestId || undefined : undefined,
          csv: audience === "csv" ? csv : undefined,
          subject,
          bodyText,
        }),
      });
      const data = await readAdminJson<{ preview?: Preview; error?: string }>(res);
      if (!res.ok || !data.preview) {
        throw new Error(data.error ?? "Aperçu impossible.");
      }
      setPreview(data.preview);
      setSubject(data.preview.subject);
      setBodyText(data.preview.bodyText);
      setSelected(new Set(data.preview.recipients.map((r) => r.email)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aperçu impossible.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async (demo: boolean) => {
    if (!preview) {
      setError("Préparez d’abord l’aperçu des destinataires.");
      return;
    }
    if (
      !demo &&
      !window.confirm(
        `Envoyer ${selected.size} email${selected.size > 1 ? "s" : ""} pour de vrai ?`
      )
    ) {
      return;
    }
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          department,
          category: category || undefined,
          workRequestId:
            audience === "work_request" ? workRequestId || undefined : undefined,
          csv: audience === "csv" ? csv : undefined,
          subject,
          bodyText,
          recipientEmails: [...selected],
          demo,
        }),
      });
      const data = await readAdminJson<{
        campaign?: CampaignRow;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Envoi impossible.");
      const sent = data.campaign?.sentCount ?? selected.size;
      const failed = data.campaign?.failedCount ?? 0;
      setSuccess(
        demo
          ? `Simulation : ${sent} email${sent > 1 ? "s" : ""} (rien n’est parti).`
          : `Envoi terminé : ${sent} ok${failed ? `, ${failed} échec(s)` : ""}.`
      );
      setPreview(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  };

  const selectedRecipients = useMemo(
    () => (preview ? preview.recipients.filter((r) => selected.has(r.email)) : []),
    [preview, selected]
  );

  const toggleEmail = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campagnes email</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Envois B2B via Brevo (pas le SMTP OVH MX Plan, limité et bloqué pour
            le marketing). Placeholders :{" "}
            <code className="rounded bg-slate-100 px-1">{"{{companyName}}"}</code>{" "}
            <code className="rounded bg-slate-100 px-1">{"{{city}}"}</code>{" "}
            <code className="rounded bg-slate-100 px-1">{"{{category}}"}</code>{" "}
            <code className="rounded bg-slate-100 px-1">{"{{url}}"}</code>
          </p>
        </div>
        <Link
          href="/admin/campagnes-sms"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Campagnes SMS →
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            configured
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {configured
            ? "Brevo / SMTP marketing configuré"
            : "Brevo non configuré — envoi réel impossible"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {optOutCount} désinscription{optOutCount !== 1 ? "s" : ""}
        </span>
        {sms && (
          <>
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                sms.ovhConfigured
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              OVH SMS{" "}
              {sms.ovhConfigured
                ? sms.ovhCreditsLeft == null
                  ? "actif"
                  : `${sms.ovhCreditsLeft} crédit${sms.ovhCreditsLeft === 1 ? "" : "s"}`
                : "off"}
            </span>
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                sms.brevoConfigured
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              Repli SMS Brevo {sms.brevoConfigured ? "actif" : "off"}
            </span>
          </>
        )}
      </div>

      {!configured && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Créez un compte{" "}
          <a
            href="https://app.brevo.com/"
            className="font-medium underline"
            target="_blank"
            rel="noreferrer"
          >
            Brevo
          </a>
          , authentifiez le domaine nord-artisan-pro.com (SPF/DKIM), puis ajoutez{" "}
          <code className="rounded bg-white px-1">BREVO_API_KEY</code> dans{" "}
          <code className="rounded bg-white px-1">.env.local</code> sur le VPS.
          Le MX Plan OVH reste pour les mails de compte (reset, confirmation).
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

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-slate-900">Destinataires</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setAudience(key);
                setPreview(null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                audience === key
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {AUDIENCE_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Département</span>
            <select
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value as "all" | "59" | "62")
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">59 et 62</option>
              <option value="59">Nord (59)</option>
              <option value="62">Pas-de-Calais (62)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Métier</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Tous les métiers</option>
              {WORK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>

        {audience === "work_request" && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-slate-600">Demande de travaux</span>
            <select
              value={workRequestId}
              onChange={(e) => setWorkRequestId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Choisir…</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.category} · {r.city} ({r.department}) · {formatWhen(r.createdAt)}
                </option>
              ))}
            </select>
          </label>
        )}

        {audience === "csv" && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-slate-600">
              Une ligne par destinataire : email ; société ; SIRET ; ville
            </span>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
              placeholder={"email;société;siret;ville"}
            />
          </label>
        )}

        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-600">Objet</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Laissé vide = modèle automatique"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-slate-600">Message (texte)</span>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Laissé vide = modèle automatique"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={previewing || loading}
            onClick={() => void handlePreview()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {previewing ? "Préparation…" : "Préparer l’aperçu"}
          </button>
        </div>
      </section>

      {preview && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              {selectedRecipients.length} destinataire
              {selectedRecipients.length !== 1 ? "s" : ""}
              {preview.optedOutSkipped
                ? ` · ${preview.optedOutSkipped} déjà désinscrits`
                : ""}
            </h2>
            <button
              type="button"
              className="text-xs font-medium text-brand-700"
              onClick={() => {
                if (selected.size === preview.recipients.length) {
                  setSelected(new Set());
                } else {
                  setSelected(new Set(preview.recipients.map((r) => r.email)));
                }
              }}
            >
              Tout (dé)cocher
            </button>
          </div>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm text-slate-700">
            {preview.recipients.map((r) => (
              <li key={r.email}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(r.email)}
                    onChange={() => toggleEmail(r.email)}
                  />
                  <span>
                    {r.companyName} · {r.email}
                    {r.city ? ` · ${r.city}` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending || selected.size === 0 || !configured}
              onClick={() => void handleSend(false)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sending ? "Envoi…" : `Envoyer ${selected.size} email(s)`}
            </button>
            <button
              type="button"
              disabled={sending || selected.size === 0 || !demoAllowed}
              onClick={() => void handleSend(true)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Simuler (démo)
            </button>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900">Historique</h2>
        {loading && campaigns.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Chargement…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun envoi pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {campaigns.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-slate-900">{c.subject}</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {formatWhen(c.createdAt)} · {c.status} · {c.sentCount}/
                  {c.recipientCount} envoyés
                  {c.failedCount ? ` · ${c.failedCount} échecs` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
