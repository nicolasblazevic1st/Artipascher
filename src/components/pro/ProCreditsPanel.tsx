"use client";

import { useCallback, useEffect, useState } from "react";
import { CREDIT_PRICE_EUR } from "@/lib/store-types";

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
  spend_unlock: "Déblocage contact",
  spend_bid: "Enchère",
  refund_unlock: "Recrédit contact",
  admin_adjust: "Ajustement",
  demo_grant: "Crédit démo",
  referral_reward: "Parrainage",
};

export default function ProCreditsPanel() {
  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<number[]>([1, 5, 10, 20]);
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
      setPacks(data.packs ?? [1, 5, 10, 20]);
      setTransactions(data.transactions ?? []);
      setDemoAllowed(data.demoAllowed === true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") === "1") {
      setSuccess("Paiement reçu — vos crédits seront crédités sous peu.");
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => load(), 1500);
    }
  }, [load]);

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
            1 crédit = {CREDIT_PRICE_EUR}&nbsp;€ — utilisable pour débloquer un contact ou
            enchérir.
          </p>
        </div>
        <p className="rounded-full bg-brand-50 px-4 py-2 text-lg font-bold text-brand-800">
          {balance} crédit{balance !== 1 ? "s" : ""}
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

      <div className="mt-4 flex flex-wrap gap-2">
        {packs.map((size) => (
          <button
            key={size}
            type="button"
            disabled={buying !== null}
            onClick={() => buy(size, false)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {buying === size
              ? "…"
              : `Acheter ${size} · ${size * CREDIT_PRICE_EUR} €`}
          </button>
        ))}
      </div>

      {demoAllowed && (
        <button
          type="button"
          disabled={buying !== null}
          onClick={() => buy(5, true)}
          className="mt-3 text-xs text-slate-500 underline"
        >
          Mode démo — ajouter 5 crédits sans paiement
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
