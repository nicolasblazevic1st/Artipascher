"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { NafCodeList } from "@/components/NafCodeLabel";
import NafMultiSelect, {
  type NafFilterOption,
} from "@/components/admin/NafMultiSelect";
import { readAdminJson } from "@/lib/admin-fetch-json";
import { formatNafWithLabel } from "@/lib/naf-trade-groups";

interface ArtisanCompanyRow {
  siren: string;
  companyName: string;
  department: "59" | "62";
  cities: string[];
  sirets: string[];
  establishments: Array<{
    siret: string;
    city: string;
    department: "59" | "62";
    postalCode: string;
    nafCode: string;
  }>;
  nafCodes: string[];
  mappedToCategory: boolean;
  hasUnmappedPrimary: boolean;
  phone?: string;
  enrichmentStatus: string;
  optedOut?: boolean;
  source: string;
}

interface Stats {
  total: number;
  active: number;
  withPhone: number;
  pendingEnrichment: number;
  invalidPhone: number;
  unmappedCategory: number;
  geocoded: number;
  withoutGeocode: number;
  byDepartment: Record<string, number>;
  topNaf: Array<{ naf: string; count: number; mapped: boolean; label?: string }>;
  nafOptions?: NafFilterOption[];
  remaining: number;
  placesEnabled: boolean;
  quota: {
    monthlyLimit: number;
    requestsProduction: number;
    requestsEnrichment: number;
    enrichmentPaused: boolean;
  };
  dailyBudget: {
    budget: number;
    paused: boolean;
    bonusToday?: number;
    base?: number;
    carryover?: number;
  };
}

const ENRICH_LABELS: Record<string, string> = {
  pending: "En attente",
  enriched: "Enrichi",
  no_match: "Sans match",
  deferred: "Différé",
  invalid_phone: "Tél. invalide",
};

export default function AdminBaseArtisansPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<ArtisanCompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [establishmentCount, setEstablishmentCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [hasPhone, setHasPhone] = useState("");
  const [enrichmentStatus, setEnrichmentStatus] = useState("");
  const [selectedNaf, setSelectedNaf] = useState<string[]>([]);
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [placesBoost, setPlacesBoost] = useState("100");
  const [addForm, setAddForm] = useState({
    siret: "",
    companyName: "",
    postalCode: "",
    city: "",
    nafCode: "",
    phone: "",
    addressLine: "",
  });

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/artisans/stats");
    const data = await res.json();
    if (res.ok) setStats(data);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "40");
      if (q.trim()) params.set("q", q.trim());
      if (department) params.set("department", department);
      if (hasPhone) params.set("hasPhone", hasPhone);
      if (enrichmentStatus) params.set("enrichmentStatus", enrichmentStatus);
      if (selectedNaf.length > 0) params.set("naf", selectedNaf.join(","));
      if (unmappedOnly) params.set("unmappedOnly", "1");
      const res = await fetch(`/api/admin/artisans?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur chargement");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setEstablishmentCount(data.establishmentCount ?? data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      const drafts: Record<string, string> = {};
      for (const row of data.items ?? []) {
        drafts[row.siren] = row.phone ?? "";
      }
      setPhoneDrafts(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, q, department, hasPhone, enrichmentStatus, selectedNaf, unmappedOnly]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function patchAllSirets(
    sirets: string[],
    body: Record<string, unknown>,
    busyKey: string
  ): Promise<boolean> {
    setBusy(busyKey);
    setError(null);
    try {
      for (const siret of sirets) {
        const res = await fetch(`/api/admin/artisans/${siret}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Échec");
      }
      await loadList();
      await loadStats();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function savePhone(row: ArtisanCompanyRow) {
    const ok = await patchAllSirets(
      row.sirets,
      { phone: phoneDrafts[row.siren] ?? "" },
      row.siren
    );
    if (ok) setSuccess(`Téléphone mis à jour · ${row.companyName}`);
  }

  async function markInvalid(row: ArtisanCompanyRow) {
    await patchAllSirets(
      row.sirets,
      { markInvalidPhone: true },
      row.siren
    );
  }

  async function toggleOptOut(row: ArtisanCompanyRow) {
    await patchAllSirets(
      row.sirets,
      { optedOut: !row.optedOut },
      row.siren
    );
  }

  async function purgeOutsidePlatformNaf() {
    if (
      !window.confirm(
        "Fermer tous les artisans actifs hors des 22 codes NAF des 16 métiers ? Ils disparaîtront des listes actives (statut closed)."
      )
    ) {
      return;
    }
    setBusy("purge-naf");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/artisans/purge-unmapped-naf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "close" }),
      });
      const data = await readAdminJson<{
        error?: string;
        result?: { removed?: number; kept?: number };
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Purge impossible");
      setSuccess(
        `Purge NAF: ${data.result?.removed ?? 0} fermés · ${data.result?.kept ?? "?"} actifs restants (22 codes métiers)`
      );
      await loadStats();
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function runAction(
    kind: "sirene" | "sirene-full" | "places" | "geocode"
  ) {
    setBusy(kind);
    setError(null);
    setSuccess(null);
    try {
      if (kind === "places") {
        const res = await fetch("/api/admin/artisans/enrich-places", {
          method: "POST",
        });
        const data = await readAdminJson<{
          error?: string;
          result?: { processed?: number; spent?: number; budget?: number };
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "Échec Places");
        setSuccess(
          `Places: traités ${data.result?.processed ?? 0}, requêtes ${data.result?.spent ?? 0}, budget ${data.result?.budget ?? "?"}`
        );
      } else if (kind === "geocode") {
        const res = await fetch("/api/admin/artisans/geocode-backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 200 }),
        });
        const data = await readAdminJson<{
          error?: string;
          result?: {
            geocoded?: number;
            failed?: number;
            remaining?: number;
            attempted?: number;
          };
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "Échec géocode BAN");
        const r = data.result;
        setSuccess(
          `Géocode BAN: ${r?.geocoded ?? 0} OK · ${r?.failed ?? 0} échecs · ${r?.remaining ?? "?"} restants (lot ${r?.attempted ?? 0})`
        );
      } else {
        const res = await fetch("/api/admin/artisans/extract-sirene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "sirene-full"
              ? { full: true, geocodeMissing: false }
              : { maxPagesPerNaf: 4, geocodeMissing: false }
          ),
        });
        const data = await readAdminJson<{
          error?: string;
          started?: boolean;
          message?: string;
          result?: { upserted?: number; pages?: number };
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "Échec SIRENE");
        if (data.started) {
          setSuccess(
            data.message ??
              "Sync SIRENE lancée en arrière-plan. Rechargez la liste dans une à deux minutes."
          );
        } else {
          setSuccess(
            `SIRENE: upsert ${data.result?.upserted ?? 0}, pages ${data.result?.pages ?? 0}`
          );
        }
      }
      await loadStats();
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function boostPlacesQuota() {
    const extra = Math.floor(Number(placesBoost));
    if (!Number.isFinite(extra) || extra < 1) {
      setError("Indiquez un nombre de requêtes Places ≥ 1.");
      return;
    }
    setBusy("places-boost");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/artisans/places-quota-boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra }),
      });
      const data = await readAdminJson<{
        error?: string;
        added?: number;
        bonusToday?: number;
        budget?: number;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Boost impossible");
      setSuccess(
        `Budget Places du jour +${data.added ?? extra} req · bonus jour ${data.bonusToday ?? "?"} · budget actuel ${data.budget ?? "?"}`
      );
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function addArtisan(e: FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError(null);
    try {
      const res = await fetch("/api/admin/artisans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec");
      setSuccess(`Artisan ajouté · ${data.artisan?.siret}`);
      setShowAdd(false);
      setAddForm({
        siret: "",
        companyName: "",
        postalCode: "",
        city: "",
        nafCode: "",
        phone: "",
        addressLine: "",
      });
      await loadStats();
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Base artisans NPC</h1>
          <p className="mt-1 text-sm text-slate-600">
            Acquisition Nord / Pas-de-Calais — SIRENE + téléphones à compléter
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runAction("sirene")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Sync SIRENE
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runAction("sirene-full")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Sync complète
          </button>
          <button
            type="button"
            disabled={
              Boolean(busy) ||
              !stats ||
              (stats.withoutGeocode ?? 0) === 0
            }
            onClick={() => void runAction("geocode")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            title="Complète lat/lon via l’API Adresse (BAN) — lots de 200"
          >
            Géocoder les manquants
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || stats?.placesEnabled === false}
            onClick={() => void runAction("places")}
            className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            Enrichir Places
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || (stats?.unmappedCategory ?? 0) === 0}
            onClick={() => void purgeOutsidePlatformNaf()}
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
            title="Ferme les actifs hors des 22 NAF des 16 métiers"
          >
            Garder 22 NAF métiers
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-900"
          >
            Ajouter
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      )}
      {busy && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Traitement en cours ({busy})…
        </div>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Actifs" value={stats.active} hint={`Total fiches ${stats.total}`} />
          <StatCard
            label="Avec GPS"
            value={stats.geocoded ?? 0}
            hint={
              stats.active > 0
                ? `${(((stats.geocoded ?? 0) / stats.active) * 100).toFixed(1)} % · ${stats.withoutGeocode ?? 0} sans coords`
                : "Aucun actif"
            }
          />
          <StatCard
            label="Avec téléphone"
            value={stats.withPhone}
            hint={`${stats.pendingEnrichment} en attente`}
          />
          <StatCard
            label="Hors catégories"
            value={stats.unmappedCategory}
            hint={`59: ${stats.byDepartment?.["59"] ?? 0} · 62: ${stats.byDepartment?.["62"] ?? 0}`}
          />
          <StatCard
            label="Quota Places"
            value={stats.remaining}
            hint={`Budget jour ${stats.dailyBudget?.budget ?? 0}${
              (stats.dailyBudget?.bonusToday ?? 0) > 0
                ? ` · bonus ${stats.dailyBudget.bonusToday}`
                : ""
            }${stats.quota.enrichmentPaused ? " · pause" : ""}`}
          />
        </div>
      )}

      {stats && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-[12rem] flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Boost Places (exceptionnel)
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Ajoute des requêtes au budget d&apos;enrichissement d&apos;aujourd&apos;hui
              uniquement (max 2000 / boost). Débloque aussi une pause mensuelle.
            </p>
          </div>
          <label className="block text-xs text-slate-600">
            Requêtes à ajouter
            <input
              type="number"
              min={1}
              max={2000}
              step={10}
              value={placesBoost}
              onChange={(e) => setPlacesBoost(e.target.value)}
              className="mt-1 block w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={Boolean(busy) || stats.placesEnabled === false}
            onClick={() => void boostPlacesQuota()}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
          >
            {busy === "places-boost" ? "Ajout…" : "Augmenter le budget jour"}
          </button>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={(e) => void addArtisan(e)}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold text-slate-900">Ajouter un artisan</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["siret", "SIRET"],
                ["companyName", "Raison sociale"],
                ["postalCode", "Code postal"],
                ["city", "Ville"],
                ["nafCode", "Code NAF"],
                ["phone", "Téléphone"],
                ["addressLine", "Adresse"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="text-slate-600">{label}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={addForm[key]}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  required={key === "siret" || key === "nafCode" || key === "postalCode"}
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={busy === "add"}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Recherche nom, ville, SIRET…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={department}
          onChange={(e) => {
            setPage(1);
            setDepartment(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Dépt. tous</option>
          <option value="59">59</option>
          <option value="62">62</option>
        </select>
        <NafMultiSelect
          options={stats?.nafOptions ?? stats?.topNaf ?? []}
          value={selectedNaf}
          onChange={(codes) => {
            setPage(1);
            setSelectedNaf(codes);
          }}
          disabled={loading && !stats}
        />
        <select
          value={hasPhone}
          onChange={(e) => {
            setPage(1);
            setHasPhone(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tél. tous</option>
          <option value="1">Avec tél.</option>
          <option value="0">Sans tél.</option>
        </select>
        <select
          value={enrichmentStatus}
          onChange={(e) => {
            setPage(1);
            setEnrichmentStatus(e.target.value);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Statut tous</option>
          {Object.entries(ENRICH_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={unmappedOnly}
            onChange={(e) => {
              setPage(1);
              setUnmappedOnly(e.target.checked);
            }}
          />
          Hors catégories
        </label>
      </div>

      {selectedNaf.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">NAF actifs :</span>
          {selectedNaf.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setPage(1);
                setSelectedNaf((prev) => prev.filter((c) => c !== code));
              }}
              className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-900 hover:bg-brand-100"
              title="Retirer ce filtre"
            >
              {formatNafWithLabel(code)}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSelectedNaf([]);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 hover:underline"
          >
            Tout effacer
          </button>
        </div>
      )}

      <p className="text-sm text-slate-600">
        {total.toLocaleString("fr-FR")} entreprise{total > 1 ? "s" : ""}
        {establishmentCount > total && (
          <span className="text-slate-500">
            {" "}
            ({establishmentCount.toLocaleString("fr-FR")} établ.)
          </span>
        )}
        {loading ? " · chargement…" : ""}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Entreprise</th>
              <th className="px-3 py-2">NAF</th>
              <th className="px-3 py-2">Téléphone</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.siren} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{row.companyName}</div>
                  <div className="text-xs text-slate-500">
                    {row.cities.join(", ")} ({row.department})
                    {row.establishments.length > 1 && (
                      <span> · {row.establishments.length} établ.</span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                    SIREN {row.siren}
                    {row.establishments.length === 1 && (
                      <> · {row.establishments[0].siret}</>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <NafCodeList codes={row.nafCodes} separator=" · " />
                  {row.hasUnmappedPrimary && (
                    <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                      Hors cat.
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    value={phoneDrafts[row.siren] ?? ""}
                    onChange={(e) =>
                      setPhoneDrafts((d) => ({ ...d, [row.siren]: e.target.value }))
                    }
                    className="w-36 rounded border border-slate-300 px-2 py-1 text-sm"
                    placeholder="06…"
                  />
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {ENRICH_LABELS[row.enrichmentStatus] ?? row.enrichmentStatus}
                  {row.optedOut ? " · opt-out" : ""}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy === row.siren}
                      onClick={() => void savePhone(row)}
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Sauver
                    </button>
                    <button
                      type="button"
                      disabled={busy === row.siren}
                      onClick={() => void markInvalid(row)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      Invalide
                    </button>
                    <button
                      type="button"
                      disabled={busy === row.siren}
                      onClick={() => void toggleOptOut(row)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {row.optedOut ? "Réactiver" : "Opt-out"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  Aucun artisan — lancer l’import local{" "}
                  <code className="rounded bg-slate-100 px-1 text-xs">
                    node scripts/import-sirene-stock.mjs --write
                  </code>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Précédent
        </button>
        <span className="text-sm text-slate-600">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Suivant
        </button>
      </div>

      {stats?.topNaf && stats.topNaf.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 font-semibold text-slate-900">Top NAF</h2>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {stats.topNaf.map((n) => (
              <li key={n.naf} className="flex justify-between gap-2 text-slate-700">
                <span>
                  {formatNafWithLabel(n.naf)}
                  {!n.mapped && (
                    <span className="ml-1 text-amber-700">(hors cat.)</span>
                  )}
                </span>
                <span className="tabular-nums text-slate-500">{n.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value.toLocaleString("fr-FR")}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
