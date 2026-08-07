"use client";

import { useCallback, useState } from "react";
import type { CompanyAgeCohort } from "@/lib/artisans-for-chantier";

interface ArtisanRow {
  siret: string;
  companyName: string;
  city: string;
  postalCode: string;
  department: string;
  nafCode: string;
  companyCreatedAt?: string;
  ageCohort: CompanyAgeCohort;
  distanceKm: number | null;
  phone?: string;
  hasPhone: boolean;
}

interface Stats {
  total: number;
  young: number;
  established: number;
  withPhone: number;
  returned: number;
}

const AGE_LABELS: Record<CompanyAgeCohort, string> = {
  young: "< 2 ans",
  established: "≥ 2 ans",
};

interface Props {
  requestId: string;
  category?: string;
}

export default function NearbyBusinessesPanel({ requestId, category }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [artisans, setArtisans] = useState<ArtisanRow[]>([]);
  const [nafCodes, setNafCodes] = useState<string[]>([]);
  const [geoFound, setGeoFound] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [radiusKm, setRadiusKm] = useState(20);
  const [ageCohort, setAgeCohort] = useState<"all" | CompanyAgeCohort>("all");
  const [hasPhone, setHasPhone] = useState<"all" | "yes" | "no">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        radiusKm: String(radiusKm),
        ageCohort,
        hasPhone,
        limit: "150",
      });
      const res = await fetch(
        `/api/admin/demandes/${requestId}/nearby?${params}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger les artisans.");
      setStats(data.stats ?? null);
      setArtisans(data.artisans ?? []);
      setNafCodes(data.nafCodes ?? []);
      setGeoFound(data.geoFound !== false);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [requestId, radiusKm, ageCohort, hasPhone]);

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-600">
          Rayon
          <select
            value={radiusKm}
            onChange={(e) => {
              setRadiusKm(Number(e.target.value));
              setOpen(false);
            }}
            className="ml-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            {[5, 10, 15, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} km
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Âge entreprise
          <select
            value={ageCohort}
            onChange={(e) => {
              setAgeCohort(e.target.value as "all" | CompanyAgeCohort);
              setOpen(false);
            }}
            className="ml-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            <option value="all">Tous</option>
            <option value="young">&lt; 2 ans</option>
            <option value="established">≥ 2 ans</option>
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Téléphone
          <select
            value={hasPhone}
            onChange={(e) => {
              setHasPhone(e.target.value as "all" | "yes" | "no");
              setOpen(false);
            }}
            className="ml-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            <option value="all">Tous</option>
            <option value="yes">Avec tél.</option>
            <option value="no">Sans tél.</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "Recherche…" : "Lister les artisans"}
        </button>
        {open && (
          <a
            href={`/admin/campagnes-sms?request=${requestId}`}
            className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-50"
          >
            Campagne SMS →
          </a>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Filtres obligatoires : statut actif · NAF de la catégorie
        {category ? ` « ${category} »` : ""}. Tri : distance croissante.
      </p>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {open && stats && (
        <div className="mt-3 space-y-3">
          {!geoFound && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Géocodage du chantier impossible — pas de classement distance.
            </p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-slate-700">
            <span>
              <strong>{stats.total}</strong> trouvés
            </span>
            <span>
              &lt; 2 ans : <strong>{stats.young}</strong>
            </span>
            <span>
              ≥ 2 ans : <strong>{stats.established}</strong>
            </span>
            <span>
              avec tél. : <strong>{stats.withPhone}</strong>
            </span>
          </div>
          {nafCodes.length > 0 && (
            <p className="text-[11px] text-slate-500">
              NAF ciblés : {nafCodes.join(", ")}
            </p>
          )}

          {artisans.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aucun artisan actif avec ces critères dans le rayon.
            </p>
          ) : (
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Dist.</th>
                    <th className="px-2 py-1.5">Entreprise</th>
                    <th className="px-2 py-1.5">NAF</th>
                    <th className="px-2 py-1.5">Âge</th>
                    <th className="px-2 py-1.5">Tél.</th>
                  </tr>
                </thead>
                <tbody>
                  {artisans.map((a) => (
                    <tr
                      key={a.siret}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-700">
                        {a.distanceKm != null
                          ? `${a.distanceKm.toFixed(1)} km`
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="font-medium text-slate-900">
                          {a.companyName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {a.city} ({a.postalCode}) · {a.siret}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-slate-600">{a.nafCode}</td>
                      <td className="px-2 py-1.5">
                        <span
                          className={
                            a.ageCohort === "young"
                              ? "rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-900"
                              : "rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-800"
                          }
                        >
                          {AGE_LABELS[a.ageCohort]}
                        </span>
                        {a.companyCreatedAt && (
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            {a.companyCreatedAt.slice(0, 10)}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-slate-700">
                        {a.hasPhone ? a.phone : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {stats.returned < stats.total && (
            <p className="text-[11px] text-slate-500">
              Affichage des {stats.returned} plus proches sur {stats.total}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
