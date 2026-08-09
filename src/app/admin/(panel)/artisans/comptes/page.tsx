"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminImpersonateProButton from "@/components/admin/AdminImpersonateProButton";

type StatusFilter = "all" | "approved" | "pending" | "rejected" | "email_unverified";

interface ArtisanAccount {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  siret: string;
  siren: string;
  city: string;
  department: "59" | "62";
  status: "pending" | "approved" | "rejected";
  rcsVerified: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  qualificationLevel?: number;
  createdAt: string;
  reviewedAt?: string;
  referralCode?: string;
  tradesLabel?: string;
  creditBalance: number;
  spentCredits: number;
  bidsCount: number;
  unlocksCount: number;
  referralsCount: number;
}

const STATUS_LABELS = {
  pending: { text: "En attente", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Approuvé", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Refusé", className: "bg-red-100 text-red-800" },
};

export default function AdminComptesArtisansPage() {
  const [accounts, setAccounts] = useState<ArtisanAccount[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    emailUnverified: 0,
  });
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/comptes-artisans");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setStats(
      data.stats ?? {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        emailUnverified: 0,
      }
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (filter === "email_unverified" && a.emailVerified) return false;
      if (
        filter !== "all" &&
        filter !== "email_unverified" &&
        a.status !== filter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        a.companyName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.siret.includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        (a.referralCode ?? "").toLowerCase().includes(q)
      );
    });
  }, [accounts, filter, query]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Comptes</h2>
      <p className="mt-1 text-sm text-slate-600">
        Suivi de tous les comptes professionnels inscrits — activité, crédits, email.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Total" value={stats.total} />
        <MiniStat label="Approuvés" value={stats.approved} />
        <MiniStat label="En attente" value={stats.pending} />
        <MiniStat label="Refusés" value={stats.rejected} />
        <MiniStat label="Email non vérifié" value={stats.emailUnverified} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Tous"],
              ["approved", "Approuvés"],
              ["pending", "En attente"],
              ["rejected", "Refusés"],
              ["email_unverified", "Email non vérifié"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === key
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher entreprise, email, SIRET…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Pour la certification documents / niveau 1, utilisez{" "}
        <Link href="/admin/artisans/certification" className="font-medium text-brand-700 underline">
          Certification
        </Link>
        .
      </p>

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucun compte artisan dans cette catégorie.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{a.companyName}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[a.status].className}`}
                    >
                      {STATUS_LABELS[a.status].text}
                    </span>
                    {a.rcsVerified && (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                        RCS
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.emailVerified
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {a.emailVerified ? "Email OK" : "Email à vérifier"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {a.email} · {a.phone}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-slate-400">
                    Inscrit le {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <AdminImpersonateProButton
                    proId={a.id}
                    companyName={a.companyName}
                  />
                </div>
              </div>

              <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                <Row label="SIRET" value={a.siret} />
                <Row label="Siège" value={`${a.city} (${a.department})`} />
                <Row label="Métiers" value={a.tradesLabel || "—"} />
                <Row
                  label="Niveau"
                  value={
                    a.qualificationLevel === 0
                      ? "Non certifié"
                      : a.qualificationLevel != null
                        ? "Certifié"
                        : "—"
                  }
                />
                <Row label="Crédits" value={`${a.creditBalance} (dépensés ${a.spentCredits})`} />
                <Row
                  label="Activité"
                  value={`${a.unlocksCount} contact${a.unlocksCount > 1 ? "s" : ""} débloqué${a.unlocksCount > 1 ? "s" : ""}`}
                />
                <Row label="Parrainage" value={a.referralCode || "—"} />
                <Row label="Filleuls" value={String(a.referralsCount)} />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-50 pb-2">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
