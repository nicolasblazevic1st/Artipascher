"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/data";

interface BidOption {
  id: string;
  companyName: string;
  amount: number;
}

interface Props {
  requestId: string;
  bids: BidOption[];
  selectedBidId?: string;
  canSelect: boolean;
}

export default function SelectArtisanPanel({
  requestId,
  bids,
  selectedBidId,
  canSelect,
}: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(bidId: string) {
    setLoadingId(bidId);
    setError(null);

    const res = await fetch(`/api/client/demandes/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Sélection impossible.");
      setLoadingId(null);
      return;
    }

    router.refresh();
    setLoadingId(null);
  }

  if (bids.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Aucune offre reçue pour le moment. Les artisans peuvent encore enchérir.
      </div>
    );
  }

  const selected = selectedBidId ? bids.find((b) => b.id === selectedBidId) : null;

  return (
    <div className="space-y-3">
      {selected && (
        <div className="rounded-xl border border-client-200 bg-client-50 p-4">
          <p className="text-sm font-medium text-client-800">Artisan retenu</p>
          <p className="mt-1 font-semibold text-slate-900">{selected.companyName}</p>
          <p className="text-sm text-slate-600">Offre : {formatPrice(selected.amount)}</p>
        </div>
      )}

      {!selected && canSelect && (
        <>
          <p className="text-sm text-slate-600">
            Comparez les offres et choisissez l&apos;artisan qui vous convient.
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {bids.map((bid) => (
              <li
                key={bid.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{bid.companyName}</p>
                  <p className="text-lg font-bold text-brand-700">{formatPrice(bid.amount)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelect(bid.id)}
                  disabled={loadingId !== null}
                  className="rounded-lg bg-client-600 px-4 py-2 text-sm font-medium text-white hover:bg-client-700 disabled:opacity-50"
                >
                  {loadingId === bid.id ? "Enregistrement…" : "Choisir cet artisan"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!selected && !canSelect && (
        <p className="text-sm text-amber-700">
          Votre demande est en cours de validation. Vous pourrez choisir un artisan dès que
          l&apos;enchère sera lancée.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
