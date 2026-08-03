"use client";

import { useCallback, useEffect, useState } from "react";
import { MIN_QUOTE_DESCRIPTION_LENGTH } from "@/lib/devis-validation";

interface ExistingQuote {
  id: string;
  status: "pending_moderation" | "approved" | "rejected";
  amount: number;
  visitDate: string;
  description: string;
  adminNote?: string;
}

interface Props {
  auctionId: string;
}

const STATUS_LABELS = {
  pending_moderation: {
    text: "En attente de validation",
    className: "bg-amber-100 text-amber-800",
  },
  approved: { text: "Publié sur le site", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Refusé — à corriger", className: "bg-red-100 text-red-800" },
};

export default function ProSubmitQuoteForm({ auctionId }: Props) {
  const [existing, setExisting] = useState<ExistingQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [visitDate, setVisitDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const loadQuote = useCallback(async () => {
    const res = await fetch(`/api/pro/devis?auctionId=${encodeURIComponent(auctionId)}`);
    if (res.ok) {
      const data = await res.json();
      setExisting(data.quote ?? null);
    }
    setLoading(false);
  }, [auctionId]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const res = await fetch("/api/pro/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auctionId,
        visitDate,
        amount: Number(amount),
        description,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Impossible de déposer le devis.");
      return;
    }

    setSuccess(true);
    setExisting(data.quote);
  }

  if (loading) {
    return (
      <p className="mt-4 text-sm text-slate-500">Chargement du formulaire devis…</p>
    );
  }

  const canSubmit =
    !existing || existing.status === "rejected";
  const descLength = description.trim().length;

  return (
    <section id="devis" className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-6">
      <h2 className="text-lg font-semibold text-brand-900">Devis après visite</h2>
      <p className="mt-2 text-sm text-brand-800">
        Après votre visite sur le chantier, déposez ici votre devis détaillé. Il sera
        validé par notre équipe avant publication.{" "}
        <strong>Vous ne pourrez enchérir qu&apos;après acceptation du devis.</strong>
      </p>

      {existing && (
        <div className="mt-4 rounded-lg border border-brand-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">Votre devis</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_LABELS[existing.status].className}`}
            >
              {STATUS_LABELS[existing.status].text}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Visite le {new Date(existing.visitDate).toLocaleDateString("fr-FR")} ·{" "}
            <strong>{existing.amount.toLocaleString("fr-FR")} €</strong>
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {existing.description}
          </p>
          {existing.adminNote && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Motif admin : {existing.adminNote}
            </p>
          )}
        </div>
      )}

      {canSubmit && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="visitDate" className="block text-sm font-medium text-slate-700">
              Date de visite sur le chantier
            </label>
            <input
              id="visitDate"
              name="visitDate"
              type="date"
              required
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
              Montant du devis (€ TTC)
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min={1}
              step={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Détail du devis
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Prestations, fournitures, main-d'œuvre, délais, garanties…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p
              className={`mt-1 text-xs ${descLength >= MIN_QUOTE_DESCRIPTION_LENGTH ? "text-emerald-600" : "text-slate-500"}`}
            >
              {descLength} / {MIN_QUOTE_DESCRIPTION_LENGTH} caractères minimum
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Devis envoyé.
              {existing?.status === "approved"
                ? " Validé — vous pouvez maintenant enchérir."
                : " En attente de validation — vous pourrez enchérir une fois accepté."}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting
              ? "Envoi…"
              : existing?.status === "rejected"
                ? "Resoumettre le devis"
                : "Déposer mon devis"}
          </button>
        </form>
      )}

      {existing?.status === "pending_moderation" && (
        <p className="mt-4 text-sm text-amber-700">
          Votre devis est en cours de modération. Vous pourrez enchérir dès qu&apos;il sera
          accepté — descendez à la section enchère ci-dessous.
        </p>
      )}

      {existing?.status === "approved" && (
        <p className="mt-4 text-sm text-emerald-700">
          Devis accepté — vous pouvez maintenant placer votre enchère ci-dessous (montant
          cohérent avec votre devis).
        </p>
      )}
    </section>
  );
}
