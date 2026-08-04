"use client";

import { useState } from "react";
import type { NearbyBusiness } from "@/lib/nearby-businesses";

interface NearbyStats {
  total: number;
  platform: number;
  gouv: number;
  smsEligible: number;
}

interface Props {
  requestId: string;
}

export default function NearbyBusinessesPanel({ requestId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<NearbyStats | null>(null);
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/demandes/${requestId}/nearby`);
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Impossible de charger les entreprises.");
      return;
    }

    setStats(data.stats);
    setBusinesses(data.businesses ?? []);
    setNote(data.note ?? null);
    setOpen(true);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100 disabled:opacity-50"
      >
        {loading ? "Recherche…" : "Artisans proches (base INSEE)"}
      </button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {open && stats && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="font-medium text-slate-800">
            {stats.total} entreprise{stats.total > 1 ? "s" : ""} à proximité ·{" "}
            {stats.platform} inscrite{stats.platform > 1 ? "s" : ""} Artipascher ·{" "}
            {stats.gouv} via annuaire public · {stats.smsEligible} joignable
            {stats.smsEligible > 1 ? "s" : ""} par SMS
          </p>
          {note && <p className="mt-2 text-slate-500">{note}</p>}
          {stats.smsEligible > 0 || stats.gouv > 0 ? (
            <a
              href={`/admin/campagnes-sms?request=${requestId}`}
              className="mt-2 inline-block rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
            >
              Préparer une campagne SMS →
            </a>
          ) : null}
          {businesses.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {businesses.slice(0, 15).map((b) => (
                <li key={b.siret} className="flex justify-between gap-2 text-slate-700">
                  <span>
                    {b.name}{" "}
                    <span className="text-slate-400">
                      · {b.city} ({b.department})
                    </span>
                  </span>
                  <span
                    className={
                      b.source === "platform"
                        ? "shrink-0 font-medium text-brand-700"
                        : "shrink-0 text-slate-400"
                    }
                  >
                    {b.source === "platform" ? "Inscrit" : "INSEE"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
