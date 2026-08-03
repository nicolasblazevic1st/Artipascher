"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/data";
import type { ProQuoteStatus } from "@/lib/store-types";

interface EnrichedQuote {
  id: string;
  companyName: string;
  projectLabel: string;
  clientName: string;
  visitDate: string;
  amount: number;
  description: string;
  status: ProQuoteStatus;
  createdAt: string;
  adminNote?: string;
}

const STATUS_LABELS = {
  pending_moderation: { text: "À modérer", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Publié", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Refusé", className: "bg-red-100 text-red-800" },
};

export default function AdminDevisPage() {
  const [quotes, setQuotes] = useState<EnrichedQuote[]>([]);
  const [filter, setFilter] = useState<"pending_moderation" | "approved" | "rejected" | "all">(
    "pending_moderation"
  );
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/devis");
    const data = await res.json();
    setQuotes(data.quotes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReview(
    id: string,
    status: "approved" | "rejected",
    adminNote?: string
  ) {
    setReviewingId(id);
    await fetch("/api/admin/devis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, adminNote }),
    });
    setReviewingId(null);
    load();
  }

  const filtered = quotes.filter((q) => (filter === "all" ? true : q.status === filter));

  return (
    <div>
      <h1 className="text-2xl font-bold">Modération des devis</h1>
      <p className="mt-1 text-sm text-slate-600">
        Chaque artisan dépose son devis après visite sur le chantier. Validez-le avant
        publication au particulier.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["pending_moderation", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {f === "all"
              ? "Tous"
              : f === "pending_moderation"
                ? "À modérer"
                : STATUS_LABELS[f].text}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucun devis dans cette catégorie.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((q) => (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{q.companyName}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[q.status].className}`}
                    >
                      {STATUS_LABELS[q.status].text}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {q.projectLabel} · Client : {q.clientName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Visite le {new Date(q.visitDate).toLocaleDateString("fr-FR")} · Déposé le{" "}
                    {new Date(q.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <p className="text-xl font-bold text-brand-700">{formatPrice(q.amount)}</p>
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {q.description}
              </p>

              {q.adminNote && (
                <p className="mt-3 text-sm text-red-600">Note admin : {q.adminNote}</p>
              )}

              {q.status === "pending_moderation" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={reviewingId === q.id}
                    onClick={() => handleReview(q.id, "approved")}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Publier au particulier
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === q.id}
                    onClick={() => {
                      const note = window.prompt("Motif du refus (optionnel) :") ?? "";
                      handleReview(q.id, "rejected", note);
                    }}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
