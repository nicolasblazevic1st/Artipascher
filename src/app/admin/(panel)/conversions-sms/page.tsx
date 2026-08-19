"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Conversion {
  phoneDisplay: string;
  phoneE164: string;
  proId: string;
  companyName: string;
  email: string;
  siret: string;
  city: string;
  department: "59" | "62";
  proStatus: "pending" | "approved" | "rejected";
  registeredAt: string;
  firstMarketingSmsAt: string;
  matchBy: Array<"phone" | "siret">;
  campaignIds: string[];
  daysToRegister: number;
}

const STATUS_LABELS = {
  pending: { text: "En attente", className: "bg-amber-100 text-amber-800" },
  approved: { text: "Approuvé", className: "bg-emerald-100 text-emerald-800" },
  rejected: { text: "Refusé", className: "bg-red-100 text-red-800" },
};

export default function AdminConversionsSmsPage() {
  const [items, setItems] = useState<Conversion[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    byPhone: 0,
    bySiret: 0,
    byBoth: 0,
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/sms-marketing-conversions");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Chargement impossible.");
      return;
    }
    setItems(data.conversions ?? []);
    setStats(
      data.stats ?? { total: 0, byPhone: 0, bySiret: 0, byBoth: 0 }
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.phoneDisplay.toLowerCase().includes(q) ||
        c.phoneE164.includes(q.replace(/\D/g, "")) ||
        c.companyName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.siret.includes(q.replace(/\s/g, ""))
    );
  }, [items, query]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Conversions SMS → comptes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Numéros ayant reçu un SMS marketing (campagne acquisition), puis
            créé un compte artisan — rapprochement par téléphone et/ou SIRET.
          </p>
        </div>
        <Link
          href="/admin/campagnes-sms"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Campagnes SMS
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-800">
          {stats.total} conversion{stats.total !== 1 ? "s" : ""}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          Match tél. : {stats.byPhone}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          Match SIRET : {stats.bySiret}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          Les deux : {stats.byBoth}
        </span>
      </div>

      <div className="mt-4">
        <input
          type="search"
          placeholder="Rechercher (tél, société, email, SIRET)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
          Aucune conversion pour l&apos;instant. Dès qu&apos;un artisan contacté
          par campagne crée un compte avec le même mobile ou SIRET, il
          apparaîtra ici.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 font-medium">Compte artisan</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Match
                </th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  1er SMS
                </th>
                <th className="px-4 py-3 font-medium">Inscription</th>
                <th className="px-4 py-3 font-medium">Délai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const status = STATUS_LABELS[c.proStatus];
                return (
                  <tr key={c.proId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold tabular-nums text-slate-900">
                        {c.phoneDisplay}
                      </p>
                      <p className="text-xs text-slate-400">{c.phoneE164}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {c.companyName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.email} · {c.city} ({c.department})
                      </p>
                      <p className="text-xs text-slate-400">SIRET {c.siret}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                      >
                        {status.text}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.matchBy.map((m) => (
                          <span
                            key={m}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-700"
                          >
                            {m === "phone" ? "Tél" : "SIRET"}
                          </span>
                        ))}
                      </div>
                      {c.campaignIds.length > 0 && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {c.campaignIds.length} campagne
                          {c.campaignIds.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-slate-600 lg:table-cell">
                      {new Date(c.firstMarketingSmsAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(c.registeredAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums text-brand-700">
                      {c.daysToRegister === 0
                        ? "J+0"
                        : `${c.daysToRegister} j`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
