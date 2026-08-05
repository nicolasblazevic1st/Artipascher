"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminImpersonateClientButton from "@/components/admin/AdminImpersonateClientButton";

type KindFilter = "all" | "individual" | "company" | "email_unverified" | "with_requests";

interface ClientAccountRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  kind: "individual" | "company";
  companyName?: string;
  siret?: string;
  siren?: string;
  companyVerified?: boolean;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
  requestsCount: number;
  pendingRequests: number;
  activeAuctions: number;
  lastRequestAt?: string;
}

export default function AdminComptesParticuliersPage() {
  const [accounts, setAccounts] = useState<ClientAccountRow[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    individuals: 0,
    companies: 0,
    emailUnverified: 0,
    withRequests: 0,
  });
  const [filter, setFilter] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/comptes-particuliers");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setStats(
      data.stats ?? {
        total: 0,
        individuals: 0,
        companies: 0,
        emailUnverified: 0,
        withRequests: 0,
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
      if (filter === "individual" && a.kind !== "individual") return false;
      if (filter === "company" && a.kind !== "company") return false;
      if (filter === "email_unverified" && a.emailVerified) return false;
      if (filter === "with_requests" && a.requestsCount === 0) return false;
      if (!q) return true;
      return (
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone ?? "").includes(q) ||
        (a.companyName ?? "").toLowerCase().includes(q) ||
        (a.siret ?? "").includes(q)
      );
    });
  }, [accounts, filter, query]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Comptes particuliers</h1>
      <p className="mt-1 text-sm text-slate-600">
        Suivi de tous les comptes clients — particuliers et entreprises, demandes liées.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Total" value={stats.total} />
        <MiniStat label="Particuliers" value={stats.individuals} />
        <MiniStat label="Entreprises" value={stats.companies} />
        <MiniStat label="Avec demandes" value={stats.withRequests} />
        <MiniStat label="Email non vérifié" value={stats.emailUnverified} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Tous"],
              ["individual", "Particuliers"],
              ["company", "Entreprises"],
              ["with_requests", "Avec demandes"],
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
          placeholder="Rechercher nom, email, téléphone…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucun compte particulier dans cette catégorie.
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
                    <h2 className="font-semibold text-slate-900">
                      {a.firstName} {a.lastName}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.kind === "company"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {a.kind === "company" ? "Entreprise" : "Particulier"}
                    </span>
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
                    {a.email}
                    {a.phone ? ` · ${a.phone}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs text-slate-400">
                    Inscrit le {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <AdminImpersonateClientButton
                    clientId={a.id}
                    label={`${a.firstName} ${a.lastName}`}
                  />
                </div>
              </div>

              <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                {a.kind === "company" && (
                  <>
                    <Row label="Société" value={a.companyName || "—"} />
                    <Row label="SIRET" value={a.siret || "—"} />
                    <Row
                      label="Vérif. société"
                      value={a.companyVerified ? "Oui" : "Non"}
                    />
                  </>
                )}
                <Row label="Demandes" value={String(a.requestsCount)} />
                <Row label="En attente" value={String(a.pendingRequests)} />
                <Row label="Enchères créées" value={String(a.activeAuctions)} />
                <Row
                  label="Dernière demande"
                  value={
                    a.lastRequestAt
                      ? new Date(a.lastRequestAt).toLocaleDateString("fr-FR")
                      : "—"
                  }
                />
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
