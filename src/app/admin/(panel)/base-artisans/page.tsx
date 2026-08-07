"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

interface ArtisanRow {
  siret: string;
  siren: string;
  companyName: string;
  city: string;
  postalCode: string;
  department: "59" | "62";
  nafCode: string;
  phone?: string;
  enrichmentStatus: string;
  status: string;
  source: string;
  optedOut?: boolean;
  mappedToCategory: boolean;
}

interface Stats {
  total: number;
  active: number;
  withPhone: number;
  pendingEnrichment: number;
  invalidPhone: number;
  unmappedCategory: number;
  byDepartment: Record<string, number>;
  topNaf: Array<{ naf: string; count: number; mapped: boolean }>;
  remaining: number;
  placesEnabled: boolean;
  quota: {
    monthlyLimit: number;
    requestsProduction: number;
    requestsEnrichment: number;
    enrichmentPaused: boolean;
  };
  dailyBudget: { budget: number; paused: boolean };
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
  const [items, setItems] = useState<ArtisanRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [hasPhone, setHasPhone] = useState("");
  const [enrichmentStatus, setEnrichmentStatus] = useState("");
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
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
      if (unmappedOnly) params.set("unmappedOnly", "1");
      const res = await fetch(`/api/admin/artisans?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur chargement");
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      const drafts: Record<string, string> = {};
      for (const row of data.items ?? []) {
        drafts[row.siret] = row.phone ?? "";
      }
      setPhoneDrafts(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [page, q, department, hasPhone, enrichmentStatus, unmappedOnly]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function savePhone(siret: string) {
    setBusy(siret);
    setError(null);
    try {
      const res = await fetch(`/api/admin/artisans/${siret}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDrafts[siret] ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec");
      setSuccess(`Téléphone mis à jour · ${siret}`);
      await loadList();
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function markInvalid(siret: string) {
    setBusy(siret);
    try {
      const res = await fetch(`/api/admin/artisans/${siret}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markInvalidPhone: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Échec");
      }
      await loadList();
      await loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function toggleOptOut(row: ArtisanRow) {
    setBusy(row.siret);
    try {
      const res = await fetch(`/api/admin/artisans/${row.siret}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optedOut: !row.optedOut }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Échec");
      }
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function runAction(kind: "sirene" | "sirene-full" | "places") {
    setBusy(kind);
    setError(null);
    setSuccess(null);
    try {
      if (kind === "places") {
        const res = await fetch("/api/admin/artisans/enrich-places", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Échec Places");
        setSuccess(
          `Places: traités ${data.result?.processed ?? 0}, requêtes ${data.result?.spent ?? 0}, budget ${data.result?.budget ?? "?"}`
        );
      } else {
        const res = await fetch("/api/admin/artisans/extract-sirene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "sirene-full"
              ? { full: true, geocodeMissing: false }
              : { maxPagesPerNaf: 4 }
          ),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Échec SIRENE");
        setSuccess(
          `SIRENE: upsert ${data.result?.upserted ?? 0}, pages ${data.result?.pages ?? 0}`
        );
      }
      await loadStats();
      await loadList();
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
            disabled={Boolean(busy) || stats?.placesEnabled === false}
            onClick={() => void runAction("places")}
            className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
          >
            Enrichir Places
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Actifs" value={stats.active} hint={`Total fiches ${stats.total}`} />
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
            hint={`Budget jour ${stats.dailyBudget?.budget ?? 0}${stats.quota.enrichmentPaused ? " · pause" : ""}`}
          />
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

      <p className="text-sm text-slate-600">
        {total.toLocaleString("fr-FR")} résultat{total > 1 ? "s" : ""}
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
              <tr key={row.siret} className="border-b border-slate-100 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-900">{row.companyName}</div>
                  <div className="text-xs text-slate-500">
                    {row.city} ({row.department}) · {row.siret}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div>{row.nafCode}</div>
                  {!row.mappedToCategory && (
                    <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                      Hors cat.
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    value={phoneDrafts[row.siret] ?? ""}
                    onChange={(e) =>
                      setPhoneDrafts((d) => ({ ...d, [row.siret]: e.target.value }))
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
                      disabled={busy === row.siret}
                      onClick={() => void savePhone(row.siret)}
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Sauver
                    </button>
                    <button
                      type="button"
                      disabled={busy === row.siret}
                      onClick={() => void markInvalid(row.siret)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      Invalide
                    </button>
                    <button
                      type="button"
                      disabled={busy === row.siret}
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
                  {n.naf}
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
