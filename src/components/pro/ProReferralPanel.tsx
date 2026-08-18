"use client";

import { useCallback, useEffect, useState } from "react";
import {
  REFERRAL_REWARD_EUR,
  REFERRAL_SPEND_THRESHOLD,
} from "@/lib/store-types";

interface ReferralRow {
  proId: string;
  companyName: string;
  appliedAt?: string;
  rewardGrantedAt?: string;
  spendProgress: number;
}

interface ReferralData {
  referralCode: string | null;
  referralLink: string | null;
  referredBy: {
    proId: string;
    companyName: string;
    referralCode?: string;
    appliedAt?: string;
  } | null;
  rewardGrantedAt?: string;
  spendProgress: number;
  spendThreshold: number;
  rewardCredits: number;
  referrals: ReferralRow[];
  rewardsEarned: number;
}

export default function ProReferralPanel() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pro/referral");
    const json = (await res.json()) as ReferralData & { error?: string };
    if (res.ok) {
      setData(json);
    } else {
      setError(json.error ?? "Impossible de charger le parrainage.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(value: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Copie impossible — sélectionnez le texte manuellement.");
    }
  }

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/pro/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeInput }),
    });
    const json = (await res.json()) as ReferralData & {
      error?: string;
      message?: string;
    };
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Validation impossible.");
      return;
    }
    setSuccess(json.message ?? "Code de parrainage validé.");
    setCodeInput("");
    setData(json);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement du parrainage…</p>;
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-red-600">{error ?? "Parrainage indisponible."}</p>
      </section>
    );
  }

  return (
    <section id="parrainage" className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Parrainage</h2>
          <p className="mt-1 text-sm text-slate-600">
            Invitez une entreprise vérifiée : dès qu&apos;elle dépense{" "}
            {REFERRAL_SPEND_THRESHOLD}&nbsp;€, vous recevez{" "}
            {REFERRAL_REWARD_EUR}&nbsp;€ de solde.
          </p>
        </div>
        {data.rewardsEarned > 0 && (
          <p className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            +{data.rewardsEarned}&nbsp;€ gagnés
          </p>
        )}
      </div>

      {data.referralCode && data.referralLink && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Mon code
            </p>
            <p className="mt-2 font-mono text-xl font-bold tracking-wider text-slate-900">
              {data.referralCode}
            </p>
            <button
              type="button"
              onClick={() => copy(data.referralCode!, "code")}
              className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {copied === "code" ? "Copié ✓" : "Copier le code"}
            </button>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Mon lien
            </p>
            <p className="mt-2 break-all text-sm text-slate-800">{data.referralLink}</p>
            <button
              type="button"
              onClick={() => copy(data.referralLink!, "link")}
              className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              {copied === "link" ? "Copié ✓" : "Copier le lien"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-900">
          Valider le code d&apos;un parrain
        </h3>
        {data.referredBy ? (
          <p className="mt-2 text-sm text-emerald-700">
            Code validé — parrain : {data.referredBy.companyName}
            {data.rewardGrantedAt
              ? " · récompense déjà versée au parrain."
              : ` · progression : ${data.spendProgress}/${data.spendThreshold} € dépensés.`}
          </p>
        ) : (
          <form onSubmit={applyCode} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Ex. APXXXXXX"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm uppercase tracking-wider focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={submitting || !codeInput.trim()}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Validation…" : "Valider"}
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}
      </div>

      {data.referrals.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Entreprises parrainées ({data.referrals.length})
          </h3>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {data.referrals.map((row) => (
              <li
                key={row.proId}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.companyName}</p>
                  {row.appliedAt && (
                    <p className="text-xs text-slate-500">
                      Depuis le {new Date(row.appliedAt).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <span
                  className={
                    row.rewardGrantedAt
                      ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                      : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                  }
                >
                  {row.rewardGrantedAt
                    ? `+${REFERRAL_REWARD_EUR} € reçus`
                    : `${row.spendProgress}/${REFERRAL_SPEND_THRESHOLD} €`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
