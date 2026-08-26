"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatUnlockPriceEur,
  UNLOCK_PRICE_MAX_EUR,
  UNLOCK_PRICE_MIN_EUR,
} from "@/lib/pricing-tiers";

interface Txn {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

const TXN_LABELS: Record<string, string> = {
  purchase: "Ancien rechargement",
  spend_unlock: "Mise en contact",
  spend_bid: "Ancienne enchère",
  refund_unlock: "Remboursement contact",
  admin_adjust: "Ajustement",
  demo_grant: "Solde démo",
  referral_reward: "Ancien crédit (parrainage)",
};

/** Solde résiduel + historique — plus d’achat de packs. */
export default function ProCreditsPanel() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/pro/credits");
    const data = await res.json();
    if (res.ok) {
      setBalance(data.balance ?? 0);
      setTransactions(data.transactions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement du solde…</p>;
  }

  return (
    <section id="credits" className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Paiements & solde</h2>
          <p className="mt-1 text-sm text-slate-600">
            Chaque mise en contact se paie au ticket du chantier (
            {UNLOCK_PRICE_MIN_EUR}&nbsp;€ à {UNLOCK_PRICE_MAX_EUR}
            &nbsp;€) via Stripe au moment du déblocage. Un solde résiduel
            (remboursement ou ancien crédit) est débité en priorité s’il est
            suffisant.
          </p>
        </div>
        <p className="rounded-full bg-brand-50 px-4 py-2 text-lg font-bold text-brand-800">
          {formatUnlockPriceEur(balance)}
        </p>
      </div>

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
