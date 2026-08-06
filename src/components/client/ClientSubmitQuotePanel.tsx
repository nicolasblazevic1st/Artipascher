"use client";

import { useCallback, useEffect, useState } from "react";
import { MIN_QUOTE_DESCRIPTION_LENGTH } from "@/lib/devis-validation";
import { formatPrice } from "@/lib/data";

interface QuoteSummary {
  id: string;
  status: "pending_moderation" | "approved" | "rejected";
  amount: number;
  visitDate: string;
  description: string;
  proofUrl?: string;
  submittedBy: "pro" | "client";
  adminNote?: string;
}

interface ArtisanOption {
  proId: string;
  companyName: string;
  quote: QuoteSummary | null;
}

interface Props {
  requestId: string;
}

const STATUS_LABELS = {
  pending_moderation: {
    text: "En attente de validation",
    className: "bg-amber-100 text-amber-800",
  },
  approved: {
    text: "Validé",
    className: "bg-emerald-100 text-emerald-800",
  },
  rejected: {
    text: "Refusé — vous pouvez renvoyer un devis",
    className: "bg-red-100 text-red-800",
  },
};

export default function ClientSubmitQuotePanel({ requestId }: Props) {
  const [artisans, setArtisans] = useState<ArtisanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [proId, setProId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [proof, setProof] = useState<File | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/client/demandes/${requestId}/devis`);
    const data = await res.json();
    if (res.ok) {
      const list = (data.artisans ?? []) as ArtisanOption[];
      setArtisans(list);
      setProId((current) => {
        if (current && list.some((a) => a.proId === current)) return current;
        const eligible = list.find((a) => !a.quote || a.quote.status === "rejected");
        return eligible?.proId ?? list[0]?.proId ?? "";
      });
    }
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = artisans.find((a) => a.proId === proId) ?? null;
  const canSubmit = selected && (!selected.quote || selected.quote.status === "rejected");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !proof) return;

    setError(null);
    setSuccess(false);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("proId", proId);
    formData.set("visitDate", visitDate);
    formData.set("amount", amount);
    formData.set("description", description);
    formData.set("proof", proof);

    const res = await fetch(`/api/client/demandes/${requestId}/devis`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Impossible de transmettre le devis.");
      return;
    }

    setSuccess(true);
    setVisitDate("");
    setAmount("");
    setDescription("");
    setProof(null);
    await load();
  }

  if (loading) {
    return (
      <p className="mt-8 text-sm text-slate-500">
        Chargement du dépôt de devis…
      </p>
    );
  }

  if (artisans.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Transmettre un devis reçu hors site
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Si un artisan accepté vous a remis un devis (e-mail, papier…) sans le
        déposer sur Artipascher, saisissez le montant ici pour publier son offre
        après validation par notre équipe.
      </p>

      <ul className="mt-4 space-y-2">
        {artisans.map((a) => (
          <li
            key={a.proId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="font-medium text-slate-800">{a.companyName}</span>
            {a.quote ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[a.quote.status].className}`}
              >
                {STATUS_LABELS[a.quote.status].text}
                {a.quote.submittedBy === "client" ? " · transmis par vous" : ""}
                {a.quote.status !== "rejected"
                  ? ` · ${formatPrice(a.quote.amount)}`
                  : ""}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Aucun devis sur le site</span>
            )}
          </li>
        ))}
      </ul>

      {canSubmit ? (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Artisan concerné
            </label>
            <select
              value={proId}
              onChange={(e) => setProId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {artisans
                .filter((a) => !a.quote || a.quote.status === "rejected")
                .map((a) => (
                  <option key={a.proId} value={a.proId}>
                    {a.companyName}
                  </option>
                ))}
            </select>
          </div>

          {selected?.quote?.status === "rejected" && selected.quote.adminNote && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Motif du refus : {selected.quote.adminNote}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Date de visite
              </label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                max={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Montant TTC (€)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Détail du devis
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              minLength={MIN_QUOTE_DESCRIPTION_LENGTH}
              placeholder="Prestations, matériaux, délais… (reprenez les infos du devis reçu)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              {description.trim().length}/{MIN_QUOTE_DESCRIPTION_LENGTH} caractères min.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Justificatif (PDF ou photo)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-slate-600"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Devis transmis. Il sera visible après validation par notre équipe.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-client-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-client-700 disabled:opacity-50"
          >
            {submitting ? "Envoi…" : "Transmettre le devis"}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Tous les artisans acceptés ont déjà un devis en cours ou validé sur le
          site.
        </p>
      )}
    </section>
  );
}
