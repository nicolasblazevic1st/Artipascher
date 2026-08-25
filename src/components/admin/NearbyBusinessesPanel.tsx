"use client";

import { useCallback, useState } from "react";
import { NafCodeLabel, NafCodeList } from "@/components/NafCodeLabel";
import {
  COMPANY_AGE_ESTABLISHED_SHORT,
  COMPANY_AGE_YOUNG_SHORT,
  type CompanyAgeCohort,
} from "@/lib/company-age";
import { formatNafList } from "@/lib/naf-trade-groups";

interface ArtisanRow {
  siret: string;
  companyName: string;
  city: string;
  postalCode: string;
  department: string;
  nafCode: string;
  nafSecondaryCodes?: string[];
  matchedNafCode: string;
  companyCreatedAt?: string;
  ageCohort: CompanyAgeCohort;
  distanceKm: number | null;
  phone?: string;
  hasPhone: boolean;
  googleRating?: number;
  googleUserRatingCount?: number;
}

interface Stats {
  total: number;
  young: number;
  established: number;
  withPhone: number;
  withRating: number;
  returned: number;
}

interface ContactTarget {
  siret: string;
  companyName: string;
  city: string;
  phone: string;
  phoneE164: string;
  distanceKm: number | null;
  isRge: boolean;
}

interface ContactTargets {
  quotaLabel: string;
  quota: number;
  selectedCount: number;
  shortfall: number;
  phones: string[];
  artisans: ContactTarget[];
}

const AGE_LABELS: Record<CompanyAgeCohort, string> = {
  young: COMPANY_AGE_YOUNG_SHORT,
  established: COMPANY_AGE_ESTABLISHED_SHORT,
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
  const [clientMinGoogleRating, setClientMinGoogleRating] = useState<
    number | null
  >(null);
  const [geoFound, setGeoFound] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [radiusKm, setRadiusKm] = useState(20);
  const [ageCohort, setAgeCohort] = useState<"all" | CompanyAgeCohort>("all");
  const [hasPhone, setHasPhone] = useState<"all" | "yes" | "no">("all");
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targets, setTargets] = useState<ContactTargets | null>(null);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [placesEnabled, setPlacesEnabled] = useState<boolean | null>(null);
  const [placesBusy, setPlacesBusy] = useState(false);
  const [placesNote, setPlacesNote] = useState<string | null>(null);

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
      setClientMinGoogleRating(
        typeof data.clientMinGoogleRating === "number"
          ? data.clientMinGoogleRating
          : null
      );
      setGeoFound(data.geoFound !== false);
      setPlacesEnabled(data.placesEnabled === true);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [requestId, radiusKm, ageCohort, hasPhone]);

  const loadContactTargets = useCallback(async () => {
    setTargetsLoading(true);
    setTargetsError(null);
    try {
      const params = new URLSearchParams({ radiusKm: String(radiusKm) });
      const res = await fetch(
        `/api/admin/demandes/${requestId}/contact-targets?${params}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible de sélectionner les numéros.");
      }
      setTargets(data);
    } catch (e) {
      setTargetsError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setTargetsLoading(false);
    }
  }, [requestId, radiusKm]);

  const runPlacesEnrich = useCallback(async () => {
    setPlacesBusy(true);
    setPlacesNote(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/demandes/${requestId}/enrich-places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radiusKm, maxArtisans: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) setPlacesEnabled(false);
        throw new Error(data.error ?? "Enrichissement Places impossible.");
      }
      const r = data.result as {
        pool?: number;
        processed?: number;
        phonesFound?: number;
        ratingsFound?: number;
        matched?: number;
        noMatch?: number;
        requestsUsed?: number;
        alreadyComplete?: number;
      };
      setPlacesNote(
        `${r.processed ?? 0} fiches interrogées · ${r.phonesFound ?? 0} tél. · ${r.ratingsFound ?? 0} notes · ${r.matched ?? 0} match Google · ${r.noMatch ?? 0} sans fiche · ${r.requestsUsed ?? 0} req.`
      );
      setPlacesEnabled(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur Places");
    } finally {
      setPlacesBusy(false);
    }
  }, [requestId, radiusKm, load]);

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
            <option value="young">{COMPANY_AGE_YOUNG_SHORT}</option>
            <option value="established">{COMPANY_AGE_ESTABLISHED_SHORT}</option>
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
        <button
          type="button"
          onClick={() => void loadContactTargets()}
          disabled={targetsLoading}
          className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-50 disabled:opacity-50"
        >
          {targetsLoading ? "Sélection…" : "Numéros à contacter"}
        </button>
        <button
          type="button"
          onClick={() => void runPlacesEnrich()}
          disabled={placesBusy || placesEnabled === false}
          title={
            placesEnabled === false
              ? "GOOGLE_PLACES_ENABLED + clé API requis sur le serveur"
              : "Interroge Google Places sur les 20 plus proches sans tél. ou sans note"
          }
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-100 disabled:opacity-50"
        >
          {placesBusy ? "Places…" : "Chercher notes & tél. (Places)"}
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
        {category ? ` « ${category} »` : ""} (principal ou autre établissement du
        SIREN). Tri : distance croissante. « Chercher notes & tél. » interroge
        Google Places sur les 20 plus proches encore sans note ou sans téléphone
        (~2 requêtes par fiche).
      </p>

      {placesNote && (
        <p className="mt-2 text-xs text-emerald-800">{placesNote}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {targetsError && (
        <p className="mt-2 text-xs text-red-600">{targetsError}</p>
      )}

      {targets && (
        <div className="mt-3 rounded-lg border border-brand-200 bg-white p-3">
          <p className="text-xs font-medium text-slate-900">
            {targets.quotaLabel}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {targets.selectedCount}/{targets.quota} mobiles sélectionnés
            {targets.shortfall > 0
              ? ` · ${targets.shortfall} manquant${targets.shortfall > 1 ? "s" : ""} dans le rayon`
              : ""}
            . Du plus proche au plus loin, critères du particulier.
          </p>
          {targets.phones.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Aucun mobile joignable pour ces critères.
            </p>
          ) : (
            <>
              <p className="mt-2 break-all font-mono text-xs text-slate-800">
                {targets.phones.join(", ")}
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-slate-700">
                {targets.artisans.map((a) => (
                  <li key={a.siret}>
                    <span className="font-medium">{a.companyName}</span>
                    {" · "}
                    {a.city}
                    {a.distanceKm != null
                      ? ` · ${a.distanceKm.toFixed(1)} km`
                      : ""}
                    {" · "}
                    {a.phoneE164}
                    {a.isRge ? " · RGE" : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

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
              {COMPANY_AGE_YOUNG_SHORT} : <strong>{stats.young}</strong>
            </span>
            <span>
              {COMPANY_AGE_ESTABLISHED_SHORT} : <strong>{stats.established}</strong>
            </span>
            <span>
              avec tél. : <strong>{stats.withPhone}</strong>
            </span>
            <span>
              avec note : <strong>{stats.withRating ?? 0}</strong>
            </span>
          </div>
          {nafCodes.length > 0 && (
            <p className="text-[11px] text-slate-500">
              NAF ciblés : {formatNafList(nafCodes, ", ")}
            </p>
          )}
          {clientMinGoogleRating != null && (
            <p className="text-[11px] text-amber-800">
              Le client a demandé une note Google ≥{" "}
              {String(clientMinGoogleRating).replace(".", ",")}/5. Cette liste
              montre tout le vivier NAF (beaucoup n’ont pas encore de note en
              base).
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
                    <th className="px-2 py-1.5">Note</th>
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
                      <td className="px-2 py-1.5 text-slate-600">
                        <div>
                          <NafCodeLabel code={a.nafCode} />
                          {a.matchedNafCode !== a.nafCode && (
                            <div className="mt-0.5 text-[10px] text-brand-700">
                              Match via {a.matchedNafCode}
                            </div>
                          )}
                        </div>
                        {a.nafSecondaryCodes && a.nafSecondaryCodes.length > 0 && (
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            Autres :{" "}
                            <NafCodeList codes={a.nafSecondaryCodes} separator=", " />
                          </div>
                        )}
                      </td>
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
                      <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-700">
                        {typeof a.googleRating === "number" ? (
                          <>
                            {a.googleRating.toFixed(1)}
                            {typeof a.googleUserRatingCount === "number"
                              ? ` (${a.googleUserRatingCount})`
                              : ""}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
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
