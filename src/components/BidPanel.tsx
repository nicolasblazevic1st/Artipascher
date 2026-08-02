"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/data";
import {
  BID_FEE_EUR,
  BID_STEP_EUR,
  suggestNextBid,
} from "@/lib/auctions";
import ProInlineLoginForm from "@/components/pro/ProInlineLoginForm";

interface BidRow {
  id: string;
  companyName: string;
  amount: number;
  createdAt: string;
}

interface Props {
  auctionId: string;
  startPrice: number;
  initialCurrentPrice: number;
  initialBids: BidRow[];
}

export default function BidPanel({
  auctionId,
  startPrice,
  initialCurrentPrice,
  initialBids,
}: Props) {
  const [currentPrice, setCurrentPrice] = useState(initialCurrentPrice);
  const [bids, setBids] = useState(initialBids);
  const [proLoggedIn, setProLoggedIn] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [amount, setAmount] = useState(suggestNextBid(initialCurrentPrice));
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showLogin, setShowLogin] = useState(false);

  const refreshFromServer = useCallback(async () => {
    const res = await fetch(`/api/encheres/${auctionId}/state`);
    if (res.ok) {
      const data = await res.json();
      setCurrentPrice(data.currentPrice);
      setBids(data.bids);
      setAmount(suggestNextBid(data.currentPrice));
    }
  }, [auctionId]);

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
    setAmount(suggestNextBid(currentPrice));
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
  }

  return (
    <section className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Placer une enchère</h2>
      <p className="mt-1 text-sm text-slate-600">
        Prix actuel : <strong className="text-brand-700">{formatPrice(currentPrice)}</strong>
        {" · "}Palier {BID_STEP_EUR} € · Frais : <strong>{BID_FEE_EUR} €</strong> par enchère
      </p>

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
            step={BID_STEP_EUR}
            min={BID_STEP_EUR}
            max={currentPrice - BID_STEP_EUR}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          />
          <p className="text-xs text-slate-500">
            Doit être inférieur à {formatPrice(currentPrice)} par paliers de {BID_STEP_EUR} €
          </p>
          <button
            type="button"
            onClick={() => handlePlaceBid(false)}
            disabled={paying || amount >= currentPrice}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {paying
              ? "Redirection paiement…"
              : `Payer ${BID_FEE_EUR} € et enchérir à ${formatPrice(amount)}`}
          </button>
          {process.env.NODE_ENV === "development" && (
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
              <li key={b.id} className="flex justify-between">
                <span>{b.companyName}</span>
                <span className="font-semibold text-brand-700">{formatPrice(b.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Départ : {formatPrice(startPrice)} · Chaque enchère coûte {BID_FEE_EUR} € au professionnel
      </p>
    </section>
  );
}
