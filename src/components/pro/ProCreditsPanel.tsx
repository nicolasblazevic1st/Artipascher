"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CREDIT_PACKS,
  CREDIT_PRICE_EUR,
  KBIS_VERIFICATION_FEE_EUR,
  creditPackUnitPriceEur,
  type CreditPack,
  type KbisPurchaseVerification,
} from "@/lib/store-types";
import { UNLOCK_CREDITS_COST, UNLOCK_PRICE_EUR } from "@/lib/client-contacts";

interface Txn {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

const TXN_LABELS: Record<string, string> = {
  purchase: "Achat",
  spend_unlock: "Mise en contact",
  spend_bid: "Ancienne enchère",
  refund_unlock: "Recrédit contact",
  admin_adjust: "Ajustement",
  demo_grant: "Crédit démo",
  referral_reward: "Parrainage",
};

export default function ProCreditsPanel() {
  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<CreditPack[]>([...CREDIT_PACKS]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [demoAllowed, setDemoAllowed] = useState(false);
  const [identityGatePending, setIdentityGatePending] = useState(false);
  const [kbisVerification, setKbisVerification] =
    useState<KbisPurchaseVerification | null>(null);
  const [feeEur, setFeeEur] = useState(KBIS_VERIFICATION_FEE_EUR);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pro/credits");
    const data = await res.json();
    if (res.ok) {
      setBalance(data.balance ?? 0);
      if (Array.isArray(data.packs) && data.packs.length > 0) {
        setPacks(data.packs as CreditPack[]);
      }
      setTransactions(data.transactions ?? []);
      setDemoAllowed(data.demoAllowed === true);
      setIdentityGatePending(data.identityGatePending === true);
      setKbisVerification(data.kbisPurchaseVerification ?? null);
      if (typeof data.kbisVerificationFeeEur === "number") {
        setFeeEur(data.kbisVerificationFeeEur);
      }
    }
    setLoading(false);
    return data as {
      balance?: number;
      kbisPurchaseVerification?: KbisPurchaseVerification | null;
    };
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") === "1") {
      setSuccess("Paiement reçu — vérification d’identité en cours…");
      window.history.replaceState({}, "", window.location.pathname);

      let attempts = 0;
      const poll = async () => {
        attempts += 1;
        const data = await load();
        const verif = data.kbisPurchaseVerification;
        if (verif?.status === "failed") {
          const refunded =
            typeof verif.refundedCents === "number"
              ? (verif.refundedCents / 100).toFixed(2).replace(".", ",")
              : null;
          setSuccess(null);
          setError(
            `Vérification d’identité refusée${
              verif.reason ? ` : ${verif.reason}` : "."
            } ${
              refunded
                ? `Remboursement de ${refunded} € effectué (frais de vérif. ${feeEur} € retenus).`
                : `Les frais de vérification (${feeEur} €) peuvent être retenus.`
            } Aucun crédit n’a été ajouté.`
          );
          return;
        }
        if ((data.balance ?? 0) > 0 || verif?.status === "passed") {
          setError(null);
          setSuccess("Paiement confirmé — vos crédits sont disponibles.");
          return;
        }
        if (attempts < 6) {
          setTimeout(poll, 1500);
        } else {
          setSuccess(
            "Paiement reçu — les crédits apparaîtront sous peu. Rechargez la page si besoin."
          );
        }
      };
      setTimeout(poll, 1500);
    }
  }, [load, feeEur]);

  async function buy(packSize: number, demo = false) {
    setBuying(packSize);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/pro/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packSize, demo }),
    });
    const data = await res.json();
    setBuying(null);

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (!res.ok) {
      setError(data.error ?? "Achat impossible.");
      return;
    }
    if (data.demo) {
      setSuccess(`${data.credited} crédit(s) ajouté(s) (mode démo).`);
      setBalance(data.balance);
      await load();
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement des crédits…</p>;
  }

  return (
    <section id="credits" className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Crédits</h2>
          <p className="mt-1 text-sm text-slate-600">
            1 crédit = {CREDIT_PRICE_EUR}&nbsp;€ = {UNLOCK_CREDITS_COST} mise en
            contact ({UNLOCK_PRICE_EUR}&nbsp;€). Packs à tarif dégressif.
          </p>
        </div>
        <p className="rounded-full bg-brand-50 px-4 py-2 text-lg font-bold text-brand-800">
          {balance} crédit{balance !== 1 ? "s" : ""}
        </p>
      </div>

      {identityGatePending && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          À l&apos;achat, une <strong>vérification d&apos;identité</strong> (extrait
          Kbis / registre) est effectuée. En cas de refus : remboursement du pack
          moins {feeEur}&nbsp;€ de frais, sans crédit.
        </p>
      )}

      {kbisVerification?.status === "passed" && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Identité vérifiée
          {kbisVerification.companyNameAtCheck
            ? ` · ${kbisVerification.companyNameAtCheck}`
            : ""}
          .
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {packs.map((pack) => {
          const unit = creditPackUnitPriceEur(pack);
          const saving =
            pack.credits > 1
              ? Math.round((1 - unit / CREDIT_PRICE_EUR) * 100)
              : 0;
          return (
            <button
              key={pack.credits}
              type="button"
              disabled={buying !== null}
              onClick={() => buy(pack.credits, false)}
              className="rounded-lg border border-brand-200 bg-brand-50/40 px-4 py-3 text-left hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
            >
              <p className="text-sm font-semibold text-slate-900">
                {buying === pack.credits
                  ? "…"
                  : `${pack.credits} crédit${pack.credits > 1 ? "s" : ""} · ${pack.priceEur} €`}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {unit}&nbsp;€ / crédit
                {saving > 0 ? ` · −${saving} %` : ""}
              </p>
            </button>
          );
        })}
      </div>

      {demoAllowed && (
        <button
          type="button"
          disabled={buying !== null}
          onClick={() => buy(1, true)}
          className="mt-3 text-xs text-slate-500 underline"
        >
          Mode démo — ajouter 1 crédit sans paiement
        </button>
      )}

      {transactions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-800">Historique</h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-slate-600">
            {transactions.map((t) => (
              <li key={t.id} className="flex justify-between gap-2 border-b border-slate-100 py-1.5">
                <span>
                  {TXN_LABELS[t.type] ?? t.type}
                  {t.note ? ` · ${t.note}` : ""}
                </span>
                <span
                  className={
                    t.amount > 0 ? "font-medium text-emerald-700" : "font-medium text-slate-800"
                  }
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount} · solde {t.balanceAfter}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
