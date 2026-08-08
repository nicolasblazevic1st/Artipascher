"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ClaimRow {
  id: string;
  auctionId: string;
  workRequestId?: string;
  proId: string;
  proCompanyName: string;
  proEmail: string;
  clientLabel: string;
  clientId?: string;
  category?: string;
  city?: string;
  hasQuote: boolean;
  paidAt: string;
  claimedAt?: string;
  claimReason?: string;
  amountEur: number;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminUnlockClaimsPage() {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/unlock-claims");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Chargement impossible.");
      setLoading(false);
      return;
    }
    setClaims(data.claims ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(unlockId: string, action: "approve" | "reject") {
    setBusyId(unlockId);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/unlock-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, unlockId }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Action impossible.");
      return;
    }
    setMessage(
      action === "approve"
        ? data.clientBlocked
          ? "Recrédit OK — client blacklisté (seuil atteint)."
          : "Recrédit OK."
        : "Signalement refusé."
    );
    await load();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        Signalements anti-churn
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Recrédits manuels quand l’auto-approbation ne s’applique pas (devis déjà
        déposé, plafond mensuel, etc.). À 3 signalements validés, le client est
        restreint pour de nouvelles demandes de contact.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-slate-500">Chargement…</p>
      ) : claims.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucun signalement en attente.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {claims.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {c.proCompanyName}
                  </h3>
                  <p className="text-sm text-slate-600">{c.proEmail}</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Client : <strong>{c.clientLabel}</strong>
                    {c.city ? ` · ${c.city}` : ""}
                    {c.category ? ` · ${c.category}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Débloqué {formatDate(c.paidAt)} · signalé{" "}
                    {formatDate(c.claimedAt)}
                    {c.hasQuote ? " · devis déjà déposé" : " · sans devis"}
                  </p>
                  {c.claimReason && (
                    <p className="mt-2 text-sm text-slate-600">{c.claimReason}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.clientId && (
                    <Link
                      href="/admin/particuliers/comptes"
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      Comptes clients
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => void decide(c.id, "reject")}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => void decide(c.id, "approve")}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Recréditer 1 crédit
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
