"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/data";
import {
  BID_FEE_EUR,
  suggestNextBid,
} from "@/lib/auctions";
import ProInlineLoginForm from "@/components/pro/ProInlineLoginForm";
import QualificationBadge from "@/components/QualificationBadge";
import type { QualificationLevel } from "@/lib/qualification-tiers";

interface BidRow {
  id: string;
  companyName: string;
  amount: number;
  createdAt: string;
  qualificationLevel?: QualificationLevel;
}

interface Eligibility {
  requiresQuote: boolean;
  canBid: boolean;
  reason?: string;
  quote?: {
    id: string;
    status: string;
    amount: number;
    maxBidAmount?: number;
  };
}

interface Props {
  auctionId: string;
  startPrice?: number;
  initialCurrentPrice?: number;
  initialBids: BidRow[];
  requiresQuote?: boolean;
}

export default function BidPanel({
  auctionId,
  startPrice,
  initialCurrentPrice,
  initialBids,
  requiresQuote = false,
}: Props) {
  const pricingReady = startPrice != null && initialCurrentPrice != null;
  const [currentPrice, setCurrentPrice] = useState(initialCurrentPrice ?? 0);
  const [bids, setBids] = useState(initialBids);
  const [proLoggedIn, setProLoggedIn] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [amount, setAmount] = useState(
    initialCurrentPrice != null ? suggestNextBid(initialCurrentPrice) ?? 1 : 1
  );
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  const [showLogin, setShowLogin] = useState(false);

  const refreshFromServer = useCallback(async () => {
    const res = await fetch(`/api/encheres/${auctionId}/state`);
    if (res.ok) {
      const data = await res.json();
      if (data.currentPrice != null) {
        setCurrentPrice(data.currentPrice);
        setAmount(suggestNextBid(data.currentPrice) ?? 1);
      }
      setBids(data.bids);
    }
  }, [auctionId]);

  const refreshEligibility = useCallback(
    async (bidAmount?: number) => {
      if (!proLoggedIn) return;
      const params = new URLSearchParams({ auctionId });
      if (bidAmount !== undefined) params.set("amount", String(bidAmount));
      const res = await fetch(`/api/pro/bid-eligibility?${params}`);
      if (res.ok) {
        setEligibility(await res.json());
      }
    },
    [auctionId, proLoggedIn]
  );

  useEffect(() => {
    async function init() {
      const sessionRes = await fetch("/api/pro/session");
      const session = await sessionRes.json();
      setProLoggedIn(session.authenticated === true);
      if (session.companyName) setCompanyName(session.companyName);

      const params = new URLSearchParams(window.location.search);
      if (params.get("bid") === "success") {
        await refreshFromServer();
        setSuccess("Enchère enregistrée après paiement de 1 €.");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    init();
  }, [refreshFromServer]);

  useEffect(() => {
    if (proLoggedIn) {
      refreshEligibility(amount);
    } else {
      setEligibility(null);
    }
  }, [proLoggedIn, amount, refreshEligibility]);

  useEffect(() => {
    if (currentPrice > 0) {
      setAmount(suggestNextBid(currentPrice) ?? 1);
    }
  }, [currentPrice]);

  async function handlePlaceBid(demo = false) {
    setPaying(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/pro/place-bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId, amount, demo }),
    });
    const data = await res.json();
    setPaying(false);

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    if (data.success) {
      await refreshFromServer();
      setSuccess(
        demo
          ? `Enchère à ${formatPrice(amount)} enregistrée (mode démo, 1 € simulé).`
          : `Enchère à ${formatPrice(amount)} enregistrée.`
      );
      return;
    }

    setError(data.error ?? "Impossible de placer l'enchère.");
    if (data.requiresQuote) {
      await refreshEligibility(amount);
    }
  }

  const quoteBlocked = eligibility?.requiresQuote && !eligibility.canBid;
  const maxBidFromQuote = eligibility?.quote?.maxBidAmount;
  const effectiveMax =
    maxBidFromQuote !== undefined
      ? Math.min(currentPrice - 1, maxBidFromQuote)
      : currentPrice - 1;

  return (
    <section id="enchere" className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Placer une enchère</h2>

      {!pricingReady ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Le prix de départ sera fixé dès validation du <strong>premier devis</strong> par
          l&apos;administration. Les artisans peuvent d&apos;ores et déjà visiter le chantier et
          déposer leur devis.
        </p>
      ) : (
        <>
      {requiresQuote && (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-brand-100">
          <strong>Obligatoire :</strong> déposez d&apos;abord un devis après visite sur le
          chantier, validé par l&apos;administration. L&apos;enchère doit rester cohérente
          avec le montant de votre devis.
        </p>
      )}
      <p className="mt-2 text-sm text-slate-600">
        Prix actuel : <strong className="text-brand-700">{formatPrice(currentPrice)}</strong>
        {" · "}Frais : <strong>{BID_FEE_EUR} €</strong> par enchère
      </p>

      {eligibility?.quote && eligibility.canBid && (
        <p className="mt-2 text-sm text-emerald-700">
          Devis validé : {formatPrice(eligibility.quote.amount)} · Enchère max. :{" "}
          {formatPrice(maxBidFromQuote ?? eligibility.quote.amount)}
        </p>
      )}

      {quoteBlocked && eligibility?.reason && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {eligibility.reason}{" "}
          <a href="#contact" className="font-medium underline">
            Déposer mon devis
          </a>
        </p>
      )}

      {success && (
        <p className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{success}</p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!proLoggedIn ? (
        <div className="mt-4">
          {!showLogin ? (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Connexion pro pour enchérir
            </button>
          ) : (
            <div className="max-w-md rounded-lg border border-slate-200 bg-white p-4">
              <ProInlineLoginForm
                compact
                onSuccess={(name) => {
                  setProLoggedIn(true);
                  setCompanyName(name);
                  setShowLogin(false);
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 max-w-md space-y-3">
          <p className="text-sm text-slate-600">
            Connecté : <strong>{companyName}</strong>
          </p>
          <label className="block text-sm font-medium text-slate-700">
            Votre enchère (€)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            step={1}
            min={1}
            max={Math.max(1, effectiveMax)}
            disabled={quoteBlocked}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm disabled:bg-slate-100"
          />
          <p className="text-xs text-slate-500">
            Montant libre, strictement inférieur à {formatPrice(currentPrice)}
            {maxBidFromQuote !== undefined &&
              ` · Max. selon votre devis : ${formatPrice(maxBidFromQuote)}`}
          </p>
          <button
            type="button"
            onClick={() => handlePlaceBid(false)}
            disabled={paying || amount >= currentPrice || quoteBlocked}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {paying
              ? "Redirection paiement…"
              : quoteBlocked
                ? "Devis requis avant d'enchérir"
                : `Payer ${BID_FEE_EUR} € et enchérir à ${formatPrice(amount)}`}
          </button>
          {process.env.NODE_ENV === "development" && !quoteBlocked && (
            <button
              type="button"
              onClick={() => handlePlaceBid(true)}
              disabled={paying || amount >= currentPrice}
              className="text-xs text-slate-500 underline"
            >
              Mode démo — simuler paiement 1 €
            </button>
          )}
        </div>
      )}

      {bids.length > 0 && (
        <div className="mt-6 border-t border-brand-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Historique ({bids.length})</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {bids.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{b.companyName}</span>
                  {b.qualificationLevel != null && (
                    <QualificationBadge level={b.qualificationLevel} compact />
                  )}
                </span>
                <span className="shrink-0 font-semibold text-brand-700">
                  {formatPrice(b.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Départ : {formatPrice(startPrice!)} · Chaque enchère coûte {BID_FEE_EUR} € au professionnel
      </p>
        </>
      )}
    </section>
  );
}
