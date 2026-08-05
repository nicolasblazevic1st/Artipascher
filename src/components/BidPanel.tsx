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
  companyName?: string;
  label?: string;
  amount: number;
  createdAt: string;
  qualificationLevel?: QualificationLevel;
  devisProofUrl?: string;
}

interface Eligibility {
  requiresQuote: boolean;
  canBid: boolean;
  reason?: string;
  maxBidsPerAuction?: number;
  bidsUsed?: number;
  bidsRemaining?: number;
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
  const [devisFile, setDevisFile] = useState<File | null>(null);
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
        if (session.authenticated) {
          await refreshEligibility();
        }
        setSuccess("Enchère enregistrée après paiement de 1 €.");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
    init();
  }, [refreshFromServer, refreshEligibility]);

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

    if (!devisFile) {
      setPaying(false);
      setError(
        "Joignez le PDF de votre devis : le montant TTC doit être identique à votre enchère au centime près."
      );
      return;
    }

    const form = new FormData();
    form.set("auctionId", auctionId);
    form.set("amount", String(amount));
    form.set("devis", devisFile);
    if (demo) form.set("demo", "true");

    const res = await fetch("/api/pro/place-bid", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setPaying(false);

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    if (data.success) {
      await refreshFromServer();
      await refreshEligibility(amount);
      setDevisFile(null);
      setSuccess(
        demo && data.demo
          ? `Enchère à ${formatPrice(amount)} enregistrée (mode démo) — devis OCR vérifié.`
          : `Enchère à ${formatPrice(amount)} enregistrée (−1 crédit) — devis OCR vérifié.`
      );
      return;
    }

    setError(data.error ?? "Impossible de placer l'enchère.");
    if (data.requiresQuote) {
      await refreshEligibility(amount);
    }
  }

  const quoteBlocked = eligibility?.requiresQuote && !eligibility.canBid;
  const bidLimitReached = (eligibility?.bidsRemaining ?? 1) <= 0;
  const maxBidFromQuote = eligibility?.quote?.maxBidAmount;
  const effectiveMax =
    maxBidFromQuote !== undefined
      ? Math.min(currentPrice - 0.01, maxBidFromQuote)
      : currentPrice - 0.01;
  const canSubmit =
    !paying &&
    amount < currentPrice &&
    !quoteBlocked &&
    !bidLimitReached &&
    devisFile != null;

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
          <strong>Obligatoire :</strong> devis après visite validé par l&apos;admin, puis à
          chaque enchère un <strong>PDF devis</strong> dont le total TTC égale votre offre{" "}
          <strong>au centime près</strong> (vérification OCR).
        </p>
      )}
      {!requiresQuote && (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600 ring-1 ring-brand-100">
          <strong>Obligatoire :</strong> joignez un PDF devis dont le total TTC égale votre
          enchère <strong>au centime près</strong> (vérification OCR).
        </p>
      )}
      <p className="mt-2 text-sm text-slate-600">
        Prix actuel : <strong className="text-brand-700">{formatPrice(currentPrice)}</strong>
        {" · "}Frais : <strong>1 crédit ({BID_FEE_EUR} €)</strong> par enchère
      </p>

      {proLoggedIn && eligibility?.maxBidsPerAuction != null && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            bidLimitReached
              ? "bg-red-50 text-red-800 ring-1 ring-red-100"
              : "bg-white text-slate-700 ring-1 ring-brand-100"
          }`}
        >
          <p className="font-medium">
            Enchères sur ce chantier : {eligibility.bidsUsed ?? 0} /{" "}
            {eligibility.maxBidsPerAuction}
          </p>
          <p className="mt-0.5 text-xs">
            {bidLimitReached
              ? "Limite atteinte — vous ne pouvez plus enchérir sur ce projet."
              : `Il vous reste ${eligibility.bidsRemaining} enchère${
                  eligibility.bidsRemaining === 1 ? "" : "s"
                } sur ce chantier.`}
          </p>
        </div>
      )}

      {eligibility?.quote && eligibility.canBid && (
        <p className="mt-2 text-sm text-emerald-700">
          Devis validé : {formatPrice(eligibility.quote.amount)} · Enchère max. :{" "}
          {formatPrice(maxBidFromQuote ?? eligibility.quote.amount)}
        </p>
      )}

      {quoteBlocked && eligibility?.reason && !bidLimitReached && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {eligibility.reason}{" "}
          <a href="#contact" className="font-medium underline">
            Déposer mon devis
          </a>
        </p>
      )}

      {bidLimitReached && eligibility?.reason && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {eligibility.reason}
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
            Votre enchère (€ TTC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            step={0.01}
            min={0.01}
            max={Math.max(0.01, effectiveMax)}
            disabled={quoteBlocked || bidLimitReached}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm disabled:bg-slate-100"
          />
          <p className="text-xs text-slate-500">
            Montant libre au centime près, strictement inférieur à {formatPrice(currentPrice)}
            {maxBidFromQuote !== undefined &&
              ` · Max. selon votre devis admin : ${formatPrice(maxBidFromQuote)}`}
          </p>

          <label className="block text-sm font-medium text-slate-700">
            Devis PDF (total TTC = enchère)
          </label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={quoteBlocked || bidLimitReached}
            onChange={(e) => setDevisFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 disabled:opacity-50"
          />
          <p className="text-xs text-slate-500">
            PDF texte uniquement (pas de scan). Le total TTC lu par OCR doit être{" "}
            <strong>strictement égal</strong> au montant saisi.
            {devisFile ? ` Fichier : ${devisFile.name}` : ""}
          </p>

          <button
            type="button"
            onClick={() => handlePlaceBid(false)}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {paying
              ? "Vérification OCR…"
              : bidLimitReached
                ? "Limite de 3 enchères atteinte"
              : quoteBlocked
                ? "Devis admin requis avant d'enchérir"
                : !devisFile
                  ? "Joignez le devis PDF pour enchérir"
                : `Enchérir à ${formatPrice(amount)} · 1 crédit`}
          </button>
          {process.env.NODE_ENV === "development" && !quoteBlocked && !bidLimitReached && (
            <button
              type="button"
              onClick={() => handlePlaceBid(true)}
              disabled={paying || amount >= currentPrice || !devisFile}
              className="text-xs text-slate-500 underline"
            >
              Mode démo — enchérir sans crédit (OCR devis obligatoire)
            </button>
          )}
          <a href="/pro/compte#credits" className="block text-xs text-brand-700 underline">
            Acheter des crédits
          </a>
        </div>
      )}

      {bids.length > 0 && (
        <div className="mt-6 border-t border-brand-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Historique ({bids.length})</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {bids.slice(0, 5).map((b, index) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{b.label ?? `Artisan ${index + 1}`}</span>
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
        Départ : {formatPrice(startPrice!)} · 1 crédit ({BID_FEE_EUR} €) par enchère · Devis PDF
        OCR obligatoire · Maximum 3 enchères par artisan et par chantier
      </p>
        </>
      )}
    </section>
  );
}
