"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminImpersonateProButton from "@/components/admin/AdminImpersonateProButton";
import {
  bodaccAnnouncementUrl,
  bodaccCollectiveSearchUrl,
} from "@/lib/bodacc";
import type {
  BodaccVerificationSnapshot,
  RgeVerificationSnapshot,
} from "@/lib/store-types";

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
  legalRepresentatives?: Array<{ fullName: string; role?: string }>;
  paymentNameCheck?: {
    status: "match" | "mismatch" | "unavailable";
    cardName?: string;
    matchedAgainst?: string;
    checkedAt: string;
  };
  level1Audit?: {
    bodacc?: BodaccVerificationSnapshot;
    rge?: RgeVerificationSnapshot;
  };
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
  const [busyId, setBusyId] = useState<string | null>(null);

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
        Suivi de tous les comptes professionnels inscrits — activité, solde, email.
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
                    {a.paymentNameCheck?.status === "match" && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Nom CB OK
                      </span>
                    )}
                    {a.paymentNameCheck?.status === "mismatch" && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Nom CB ≠ dirigeants
                      </span>
                    )}
                    {a.level1Audit?.bodacc?.status === "clear" && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        BODACC OK
                      </span>
                    )}
                    {a.level1Audit?.bodacc?.status === "active_procedure" && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
                        BODACC procédure
                      </span>
                    )}
                    {a.level1Audit?.rge?.status === "verified" && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        RGE ADEME
                      </span>
                    )}
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
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={async () => {
                      const typed = window.prompt(
                        `Supprimer définitivement le compte pro « ${a.companyName} » ?\n\nTapez l'email exact pour confirmer :\n${a.email}`
                      );
                      if (!typed) return;
                      if (typed.trim().toLowerCase() !== a.email.toLowerCase()) {
                        window.alert("Email incorrect — suppression annulée.");
                        return;
                      }
                      if (
                        !window.confirm(
                          "Dernière confirmation : le compte, le solde et les documents seront effacés. L'historique marketplace sera anonymisé."
                        )
                      ) {
                        return;
                      }
                      setBusyId(a.id);
                      const res = await fetch("/api/admin/comptes-artisans", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          proId: a.id,
                          confirmEmail: a.email,
                        }),
                      });
                      const data = await res.json();
                      setBusyId(null);
                      if (!res.ok) {
                        window.alert(data.error ?? "Suppression impossible.");
                        return;
                      }
                      await load();
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-900 ring-1 ring-red-300 hover:bg-red-50 disabled:opacity-50"
                  >
                    Supprimer le compte
                  </button>
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
                <Row
                  label="Dirigeants"
                  value={
                    a.legalRepresentatives?.length
                      ? a.legalRepresentatives
                          .map((r) =>
                            r.role ? `${r.fullName} (${r.role})` : r.fullName
                          )
                          .join(" · ")
                      : "—"
                  }
                />
                {a.paymentNameCheck && (
                  <Row
                    label="Dernier paiement CB"
                    value={
                      a.paymentNameCheck.status === "match"
                        ? `Cohérent${a.paymentNameCheck.cardName ? ` (${a.paymentNameCheck.cardName})` : ""}`
                        : a.paymentNameCheck.status === "mismatch"
                          ? `À surveiller${a.paymentNameCheck.cardName ? ` — ${a.paymentNameCheck.cardName}` : ""}`
                          : "Nom non disponible"
                    }
                  />
                )}
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                {(() => {
                  const detail = a.level1Audit?.bodacc
                    ? bodaccAnnouncementUrl({
                        url: a.level1Audit.bodacc.url,
                        announcementId: a.level1Audit.bodacc.announcementId,
                      })
                    : null;
                  return detail ? (
                    <a
                      href={detail}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Annonce BODACC signalée
                    </a>
                  ) : null;
                })()}
                <a
                  href={bodaccCollectiveSearchUrl(a.siren)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Consulter BODACC
                </a>
                <Link
                  href="/admin/artisans/certification"
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                >
                  Voir dossier / PDFs
                </Link>
              </div>
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
