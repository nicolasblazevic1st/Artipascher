"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/data";

interface OfferRow {
  id: string;
  workRequestId: string;
  auctionId: string;
  companyName: string;
  projectLabel: string;
  amount: number;
  visitDate: string;
  description: string;
  status: "pending_moderation" | "approved" | "rejected";
  proofUrl?: string;
  submittedBy: "pro" | "client";
  canAttachProof: boolean;
  adminNote?: string;
  createdAt: string;
}

const STATUS_LABELS = {
  pending_moderation: {
    text: "En validation",
    className: "bg-amber-100 text-amber-800",
  },
  approved: { text: "Validée", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Refusée", className: "bg-red-100 text-red-800" },
};

export default function ClientOffersPanel() {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/client/offres");
    const data = await res.json();
    if (res.ok) setOffers(data.offers ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function attachProof(offerId: string, file: File | null) {
    if (!file) return;
    setUploadingId(offerId);
    setError(null);
    setSuccessId(null);

    const formData = new FormData();
    formData.set("proof", file);

    const res = await fetch(`/api/client/offres/${offerId}/proof`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploadingId(null);

    if (!res.ok) {
      setError(data.error ?? "Impossible d'ajouter le justificatif.");
      return;
    }
    setSuccessId(offerId);
    await load();
  }

  if (loading) {
    return <p className="mt-8 text-sm text-slate-500">Chargement des offres…</p>;
  }

  if (offers.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-slate-600">
          Aucune offre pour le moment. Acceptez un artisan, puis saisissez son prix
          depuis la fiche de votre demande (avec ou sans devis joint).
        </p>
        <Link
          href="/particulier/espace/demandes"
          className="mt-4 inline-block rounded-lg bg-client-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-client-700"
        >
          Voir mes demandes
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <ul className="mt-6 space-y-4">
        {offers.map((o) => (
          <li key={o.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{o.companyName}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[o.status].className}`}
                  >
                    {STATUS_LABELS[o.status].text}
                  </span>
                  {o.submittedBy === "client" && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                      Saisi par vous
                    </span>
                  )}
                  {!o.proofUrl && o.submittedBy === "client" && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Sans justificatif
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">{o.projectLabel}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Visite le {new Date(o.visitDate).toLocaleDateString("fr-FR")} ·{" "}
                  {new Date(o.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <p className="text-xl font-bold text-client-700">{formatPrice(o.amount)}</p>
            </div>

            {o.adminNote && (
              <p className="mt-3 text-sm text-red-600">Note : {o.adminNote}</p>
            )}

            {o.proofUrl ? (
              <p className="mt-3 text-sm">
                <a
                  href={o.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-client-700 underline"
                >
                  Voir le justificatif
                </a>
              </p>
            ) : o.canAttachProof ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">
                  Ajouter le devis (PDF ou photo)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Vous avez saisi le prix sans justificatif — joignez-le quand vous
                  l&apos;avez.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={uploadingId === o.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void attachProof(o.id, file);
                    e.target.value = "";
                  }}
                  className="mt-3 block w-full text-sm text-slate-600"
                />
                {uploadingId === o.id && (
                  <p className="mt-2 text-xs text-slate-500">Envoi…</p>
                )}
                {successId === o.id && (
                  <p className="mt-2 text-xs text-emerald-700">Justificatif ajouté.</p>
                )}
              </div>
            ) : null}

            <Link
              href={`/particulier/espace/demandes/${o.workRequestId}`}
              className="mt-4 inline-block text-sm font-medium text-client-600 hover:text-client-700"
            >
              Voir la demande →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
