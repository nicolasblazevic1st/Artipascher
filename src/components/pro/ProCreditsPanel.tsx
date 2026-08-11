"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CONTACT_BALANCE_PACKS,
  CONTACT_UNLOCK_REF_EUR,
  contactBalancePackDiscountPercent,
  type ContactBalancePack,
} from "@/lib/store-types";
import { formatUnlockPriceEur } from "@/lib/pricing-tiers";

interface Txn {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

const TXN_LABELS: Record<string, string> = {
  purchase: "Rechargement",
  spend_unlock: "Mise en contact",
  spend_bid: "Ancienne enchère",
  refund_unlock: "Remboursement contact",
  admin_adjust: "Ajustement",
  demo_grant: "Solde démo",
  referral_reward: "Parrainage",
};

export default function ProCreditsPanel() {
  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<ContactBalancePack[]>([
    ...CONTACT_BALANCE_PACKS,
  ]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [demoAllowed, setDemoAllowed] = useState(false);
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
        const normalized = (data.packs as Array<Record<string, number>>).map(
          (p) => ({
            creditEur: p.creditEur ?? p.credits ?? 0,
            payEur: p.payEur ?? p.priceEur ?? 0,
          })
        );
        if (normalized.every((p) => p.creditEur > 0)) {
          setPacks(normalized as ContactBalancePack[]);
        }
      }
      setTransactions(data.transactions ?? []);
      setDemoAllowed(data.demoAllowed === true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") === "1") {
      const sessionId = params.get("session_id");
      setSuccess("Paiement reçu — confirmation du solde…");
      window.history.replaceState({}, "", window.location.pathname + "#credits");

      void (async () => {
        if (sessionId) {
          try {
            const res = await fetch("/api/pro/credits/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
            const data = await res.json();
            if (res.ok) {
              setBalance(data.balance ?? 0);
              setSuccess(
                data.alreadyApplied
                  ? "Paiement déjà pris en compte — solde à jour."
                  : `${formatUnlockPriceEur(data.credited ?? 0)} ajoutés au solde.`
              );
              await load();
              return;
            }
            setError(data.error ?? "Confirmation du paiement impossible.");
          } catch {
            setError("Confirmation du paiement impossible.");
          }
        }
        await load();
      })();
    }
  }, [load]);

  async function buyPack(creditEur: number, demo = false) {
    setBuying(creditEur);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/pro/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packSize: creditEur, creditEur, demo }),
    });
    const data = await res.json();
    setBuying(null);

    if (!res.ok) {
      setError(data.error ?? "Achat impossible.");
      return;
    }
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setBalance(data.balance ?? 0);
    setSuccess(
      `Solde crédité de ${formatUnlockPriceEur(data.credited ?? creditEur)}.`
    );
    await load();
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement du solde…</p>;
  }

  return (
    <section id="credits" className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Solde</h2>
          <p className="mt-1 text-sm text-slate-600">
            Rechargez votre solde pour débloquer des contacts (
            {CONTACT_UNLOCK_REF_EUR - 5}&nbsp;€ à {CONTACT_UNLOCK_REF_EUR + 5}
            &nbsp;€ selon le chantier). Packs à tarif dégressif.
          </p>
        </div>
        <p className="rounded-full bg-brand-50 px-4 py-2 text-lg font-bold text-brand-800">
          {formatUnlockPriceEur(balance)}
        </p>
      </div>

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
          const discount = contactBalancePackDiscountPercent(pack);
          return (
            <button
              key={pack.creditEur}
              type="button"
              disabled={buying !== null}
              onClick={() => buyPack(pack.creditEur, false)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
            >
              <p className="font-semibold text-slate-900">
                {formatUnlockPriceEur(pack.creditEur)} de solde
              </p>
              <p className="mt-0.5 text-sm text-slate-600">
                {formatUnlockPriceEur(pack.payEur)}
                {discount > 0 ? ` · −${discount} %` : ""}
              </p>
              <p className="mt-2 text-xs font-medium text-brand-700">
                {buying === pack.creditEur ? "Redirection…" : "Acheter"}
              </p>
            </button>
          );
        })}
      </div>

      {demoAllowed && (
        <button
          type="button"
          disabled={buying !== null}
          onClick={() => buyPack(packs[0]?.creditEur ?? 20, true)}
          className="mt-3 text-xs text-slate-500 underline"
        >
          Mode démo — créditer {formatUnlockPriceEur(packs[0]?.creditEur ?? 20)}{" "}
          sans paiement
        </button>
      )}

      {transactions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Historique</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {transactions.map((txn) => (
              <li
                key={txn.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {TXN_LABELS[txn.type] ?? txn.type}
                  </p>
                  {txn.note && (
                    <p className="text-xs text-slate-500">{txn.note}</p>
                  )}
                </div>
                <p
                  className={
                    txn.amount >= 0
                      ? "font-semibold text-emerald-700"
                      : "font-semibold text-slate-700"
                  }
                >
                  {txn.amount >= 0 ? "+" : ""}
                  {formatUnlockPriceEur(txn.amount)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
