"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminImpersonateProButton from "@/components/admin/AdminImpersonateProButton";
import { DECENNALE_STATUS_LABELS } from "@/lib/decennale-verification";
import { getProTradeSelections } from "@/lib/pro-trades";
import type {
  DecennaleVerificationStatus,
  DocumentVerificationStatus,
  ProRegistration,
} from "@/lib/store-types";

type Filter =
  | "all"
  | "approved"
  | "rejected"
  | "pending"
  | "pending_docs"
  | "with_docs";

type ProRow = Omit<ProRegistration, "passwordHash"> & {
  documentsCount: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  pendingDecennales: number;
  hasAnyDocument: boolean;
};

const STATUS_LABELS = {
  pending: { text: "En attente", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Certifié", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Niveau 0 / Refusé", className: "bg-red-100 text-red-800" },
};

const DOC_STATUS_LABELS: Record<
  DocumentVerificationStatus,
  { text: string; className: string }
> = {
  en_attente_verification: {
    text: "À vérifier",
    className: "bg-amber-100 text-amber-800",
  },
  validé: { text: "Validé", className: "bg-emerald-100 text-emerald-800" },
  rejeté: { text: "Rejeté", className: "bg-red-100 text-red-800" },
};

function isPdf(url: string) {
  return url.toLowerCase().endsWith(".pdf");
}

export default function AdminDocumentsArtisansPage() {
  const [registrations, setRegistrations] = useState<ProRow[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    withDocuments: 0,
    approved: 0,
    rejected: 0,
    pendingReview: 0,
  });
  const [filter, setFilter] = useState<Filter>("with_docs");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteByPro, setNoteByPro] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/documents-artisans");
    const data = await res.json();
    setRegistrations(data.registrations ?? []);
    setStats(
      data.stats ?? {
        total: 0,
        withDocuments: 0,
        approved: 0,
        rejected: 0,
        pendingReview: 0,
      }
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter((r) => {
      if (filter === "with_docs" && !r.hasAnyDocument) return false;
      if (filter === "pending_docs" && r.pendingDocuments === 0 && r.pendingDecennales === 0) {
        return false;
      }
      if (
        filter !== "all" &&
        filter !== "with_docs" &&
        filter !== "pending_docs" &&
        r.status !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.companyName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.siret.includes(q) ||
        r.city.toLowerCase().includes(q)
      );
    });
  }, [registrations, filter, query]);

  async function patch(body: Record<string, unknown>) {
    const proId = String(body.proId ?? "");
    setBusyId(proId || null);
    setError(null);
    const res = await fetch("/api/admin/documents-artisans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Action impossible.");
      return;
    }
    await load();
  }

  async function demote(proId: string, companyName: string) {
    const note = noteByPro[proId]?.trim();
    const ok = window.confirm(
      `Renvoyer « ${companyName} » au niveau 0 ?\n\nLe compte sera refusé, la certification retirée, et la connexion bloquée. Les fichiers restent conservés comme preuves.`
    );
    if (!ok) return;
    await patch({
      action: "demote_level_zero",
      proId,
      adminNote: note || undefined,
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Documents artisans</h1>
      <p className="mt-1 text-sm text-slate-600">
        Consultez les pièces envoyées, validez ou rejetez chaque document, et renvoyez
        un compte frauduleux au niveau 0.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Comptes" value={stats.total} />
        <MiniStat label="Avec documents" value={stats.withDocuments} />
        <MiniStat label="À vérifier" value={stats.pendingReview} />
        <MiniStat label="Certifiés" value={stats.approved} />
        <MiniStat label="Niveau 0 / refusés" value={stats.rejected} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["with_docs", "Avec documents"],
              ["pending_docs", "À vérifier"],
              ["approved", "Certifiés"],
              ["rejected", "Niveau 0"],
              ["pending", "En attente"],
              ["all", "Tous"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === key
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher entreprise, email, SIRET…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Certification automatique et niveaux affichés :{" "}
        <Link href="/admin/professionnels" className="font-medium text-brand-700 underline">
          Artisans
        </Link>
        .
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucun dossier dans cette catégorie.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {filtered.map((r) => {
            const trades = getProTradeSelections(r);
            const busy = busyId === r.id;
            return (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{r.companyName}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[r.status].className}`}
                      >
                        {STATUS_LABELS[r.status].text}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {r.email} · {r.phone} · SIRET {r.siret}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.city} ({r.department}) · inscrit le{" "}
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                    {r.adminNote && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Note admin : {r.adminNote}
                      </p>
                    )}
                  </div>
                  <AdminImpersonateProButton
                    proId={r.id}
                    companyName={r.companyName}
                  />
                </div>

                <section className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Documents transmis ({r.documents?.length ?? 0})
                  </h3>
                  {(r.documents?.length ?? 0) === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Aucun document général.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {r.documents!.map((doc) => {
                        const status =
                          doc.verificationStatus ?? "en_attente_verification";
                        const meta = DOC_STATUS_LABELS[status];
                        return (
                          <li
                            key={`${doc.id}-${doc.fileUrl}`}
                            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {doc.label}
                                </p>
                                <p className="text-xs text-slate-500">{doc.fileName}</p>
                                <span
                                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                                >
                                  {meta.text}
                                </span>
                                {doc.ocrHints?.rawSnippet && (
                                  <p className="mt-2 text-xs text-slate-500">
                                    OCR : {doc.ocrHints.rawSnippet}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
                                >
                                  {isPdf(doc.fileUrl) ? "Ouvrir PDF" : "Voir"}
                                </a>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    patch({
                                      action: "set_document_status",
                                      proId: r.id,
                                      documentId: doc.id,
                                      verificationStatus: "validé",
                                    })
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Valider
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    patch({
                                      action: "set_document_status",
                                      proId: r.id,
                                      documentId: doc.id,
                                      verificationStatus: "rejeté",
                                    })
                                  }
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Rejeter
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {trades.length > 0 && (
                  <section className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Décennale par métier
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {trades.map((selection) => {
                        const status =
                          selection.decennaleStatus ?? "en_attente_verification";
                        const meta = DECENNALE_STATUS_LABELS[status];
                        return (
                          <li
                            key={selection.tradeGroupId}
                            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {selection.tradeGroupLabel}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {selection.qualibatJobLabel}
                                </p>
                                <span
                                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
                                >
                                  {meta.text}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {selection.decennaleDocument && (
                                  <a
                                    href={selection.decennaleDocument.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
                                  >
                                    Voir l&apos;attestation
                                  </a>
                                )}
                                {(
                                  [
                                    ["validé", "Valider"],
                                    ["en_attente_verification", "À vérifier"],
                                    ["non_couvert", "Non couvert"],
                                  ] as const
                                ).map(([value, label]) => (
                                  <button
                                    key={value}
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      patch({
                                        action: "set_decennale_status",
                                        proId: r.id,
                                        tradeGroupId: selection.tradeGroupId,
                                        decennaleStatus:
                                          value as DecennaleVerificationStatus,
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                <section className="mt-5 rounded-xl border border-red-100 bg-red-50/50 p-4">
                  <h3 className="text-sm font-semibold text-red-900">
                    Modération compte
                  </h3>
                  <p className="mt-1 text-xs text-red-800/80">
                    Niveau 0 = compte refusé, plus de certification, connexion impossible.
                    Les fichiers restent accessibles ici comme preuves.
                  </p>
                  <textarea
                    value={noteByPro[r.id] ?? ""}
                    onChange={(e) =>
                      setNoteByPro((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Motif (fraude, faux documents…)"
                    className="mt-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => demote(r.id, r.companyName)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {busy ? "Traitement…" : "Renvoyer au niveau 0"}
                      </button>
                    )}
                    {r.status === "rejected" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          patch({
                            action: "restore_approved",
                            proId: r.id,
                            adminNote: noteByPro[r.id]?.trim() || undefined,
                          })
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Réintégrer (certifié N1)
                      </button>
                    )}
                  </div>
                </section>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
