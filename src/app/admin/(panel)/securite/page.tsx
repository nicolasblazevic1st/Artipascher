"use client";

import { useCallback, useEffect, useState } from "react";

interface LoginLogEntry {
  id: string;
  at: string;
  ip: string;
  userAgent: string;
  success: boolean;
  reason?: string;
}

const REASON_LABELS: Record<string, string> = {
  ok: "Connexion réussie",
  invalid_password: "Mot de passe incorrect",
  rate_limited: "Trop de tentatives",
  invalid_request: "Requête invalide",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

export default function AdminSecuritePage() {
  const [entries, setEntries] = useState<LoginLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/security/login-log?limit=100");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur chargement");
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const failures = entries.filter((e) => !e.success).length;
  const successes = entries.filter((e) => e.success).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sécurité</h1>
        <p className="mt-1 text-sm text-slate-600">
          Historique des connexions à l&apos;administration (500 dernières
          tentatives max).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Total journalisé</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase text-emerald-700">Réussies (page)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{successes}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium uppercase text-red-700">Échouées (page)</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{failures}</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-medium">SSH VPS</p>
        <p className="mt-1">
          Pour limiter SSH à ton IP fixe, exécute sur le serveur :{" "}
          <code className="rounded bg-amber-100 px-1">
            sudo bash deploy/lock-ssh-to-ip.sh TON_IP_PUBLIQUE
          </code>
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Tentatives de connexion</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm text-brand-700 hover:underline"
          >
            Actualiser
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Chargement…</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Aucune tentative enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">IP</th>
                  <th className="px-4 py-2">Résultat</th>
                  <th className="px-4 py-2">Navigateur</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-2 text-slate-700">
                      {formatDate(row.at)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{row.ip}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          row.success
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {REASON_LABELS[row.reason ?? ""] ??
                          (row.success ? "OK" : "Échec")}
                      </span>
                    </td>
                    <td
                      className="max-w-xs truncate px-4 py-2 text-xs text-slate-500"
                      title={row.userAgent}
                    >
                      {row.userAgent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
