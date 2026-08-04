"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/data";
import DecennaleVerifiedBadge from "@/components/DecennaleVerifiedBadge";
import QualificationBadge from "@/components/QualificationBadge";
import type { QualificationLevel } from "@/lib/qualification-tiers";

interface QuoteOption {
  id: string;
  companyName: string;
  amount: number;
  description: string;
  visitDate: string;
  qualificationLevel?: QualificationLevel;
  decennaleVerifiedLabels?: string[];
}

interface BidOption {
  id: string;
  companyName: string;
  amount: number;
  qualificationLevel?: QualificationLevel;
  decennaleVerifiedLabels?: string[];
}

interface Props {
  requestId: string;
  quotes: QuoteOption[];
  bids: BidOption[];
  selectedQuoteId?: string;
  selectedBidId?: string;
  canSelect: boolean;
}

export default function SelectArtisanPanel({
  requestId,
  quotes,
  bids,
  selectedQuoteId,
  selectedBidId,
  canSelect,
}: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectQuote(quoteId: string) {
    setLoadingId(quoteId);
    setError(null);

    const res = await fetch(`/api/client/demandes/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
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

  async function handleSelectBid(bidId: string) {
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

  const selectedQuote = selectedQuoteId
    ? quotes.find((q) => q.id === selectedQuoteId)
    : null;
  const selectedBid = selectedBidId ? bids.find((b) => b.id === selectedBidId) : null;
  const selected = selectedQuote ?? selectedBid;

  if (quotes.length > 0) {
    return (
      <div className="space-y-3">
        {selectedQuote && (
          <div className="rounded-xl border border-client-200 bg-client-50 p-4">
            <p className="text-sm font-medium text-client-800">Artisan retenu</p>
            <p className="mt-1 font-semibold text-slate-900">{selectedQuote.companyName}</p>
            <p className="text-sm text-slate-600">
              Devis : {formatPrice(selectedQuote.amount)}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
              {selectedQuote.description}
            </p>
          </div>
        )}

        {!selectedQuote && canSelect && (
          <>
            <p className="text-sm text-slate-600">
              Comparez les devis validés (après visite sur site) et choisissez l&apos;artisan
              qui vous convient.
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {quotes.map((quote) => (
                <li key={quote.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">{quote.companyName}</p>
                        {quote.qualificationLevel != null && (
                          <QualificationBadge level={quote.qualificationLevel} compact />
                        )}
                        {quote.decennaleVerifiedLabels && (
                          <DecennaleVerifiedBadge
                            labels={quote.decennaleVerifiedLabels}
                            compact
                          />
                        )}
                      </div>
                      <p className="text-lg font-bold text-brand-700">
                        {formatPrice(quote.amount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Visite le{" "}
                        {new Date(quote.visitDate).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                        {quote.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectQuote(quote.id)}
                      disabled={loadingId !== null}
                      className="shrink-0 rounded-lg bg-client-600 px-4 py-2 text-sm font-medium text-white hover:bg-client-700 disabled:opacity-50"
                    >
                      {loadingId === quote.id ? "Enregistrement…" : "Choisir cet artisan"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {!selectedQuote && !canSelect && (
          <p className="text-sm text-amber-700">
            Votre demande est en cours de validation. Les devis apparaîtront ici une fois
            les artisans passés sur site et leurs devis validés.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Aucun devis validé pour le moment. Les artisans contactent le particulier, visitent
        le chantier, puis déposent un devis vérifié par Artipascher.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected && !selectedQuote && (
        <div className="rounded-xl border border-client-200 bg-client-50 p-4">
          <p className="text-sm font-medium text-client-800">Artisan retenu</p>
          <p className="mt-1 font-semibold text-slate-900">{selected.companyName}</p>
          <p className="text-sm text-slate-600">Offre : {formatPrice(selected.amount)}</p>
        </div>
      )}

      {!selected && canSelect && (
        <>
          <p className="text-sm text-slate-600">
            En attente de devis après visite. Offres indicatives en attendant :
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {bids.map((bid) => (
              <li
                key={bid.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{bid.companyName}</p>
                    {bid.qualificationLevel != null && (
                      <QualificationBadge level={bid.qualificationLevel} compact />
                    )}
                    {bid.decennaleVerifiedLabels && (
                      <DecennaleVerifiedBadge labels={bid.decennaleVerifiedLabels} compact />
                    )}
                  </div>
                  <p className="text-lg font-bold text-brand-700">{formatPrice(bid.amount)}</p>
                  <p className="text-xs text-slate-400">Offre indicative en ligne</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectBid(bid.id)}
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
