"use client";

import { useCallback, useEffect, useState } from "react";

interface InterestItem {
  id: string;
  status: "pending" | "accepted" | "refused" | "expired";
  createdAt: string;
  expiresAt: string;
  companyName: string;
  siret: string;
  city: string;
  trades: string;
}

const STATUS_LABELS: Record<InterestItem["status"], string> = {
  pending: "En attente",
  accepted: "Accepté",
  refused: "Refusé",
  expired: "Expiré",
};

interface Props {
  workRequestId: string;
}

export default function ClientContactRequestsPanel({ workRequestId }: Props) {
  const [items, setItems] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/client/demandes/${workRequestId}/contact-requests`);
    const data = await res.json();
    if (res.ok) setItems(data.items ?? []);
    setLoading(false);
  }, [workRequestId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, decision: "accepted" | "refused") {
    setActingId(id);
    setError(null);
    const res = await fetch(`/api/client/contact-requests/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await res.json();
    setActingId(null);
    if (!res.ok) {
      setError(data.error ?? "Action impossible.");
      return;
    }
    await load();
  }

  if (loading) {
    return <p className="mt-6 text-sm text-slate-500">Chargement des artisans intéressés…</p>;
  }

  if (items.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        Aucun artisan n&apos;a encore manifesté son intérêt pour cette offre.
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Artisans intéressés</h2>
      <p className="mt-1 text-sm text-slate-600">
        Acceptez un artisan pour qu&apos;il puisse débloquer vos coordonnées (1&nbsp;crédit).
        Vous avez 48&nbsp;h pour répondre à chaque demande.
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{item.companyName}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  SIRET {item.siret}
                  {item.city ? ` · ${item.city}` : ""}
                </p>
                {item.trades && (
                  <p className="mt-1 text-xs text-slate-600">{item.trades}</p>
                )}
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                {STATUS_LABELS[item.status]}
              </span>
            </div>

            {item.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actingId === item.id}
                  onClick={() => decide(item.id, "accepted")}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Accepter
                </button>
                <button
                  type="button"
                  disabled={actingId === item.id}
                  onClick={() => decide(item.id, "refused")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Refuser
                </button>
                <span className="self-center text-xs text-slate-400">
                  Expire le {new Date(item.expiresAt).toLocaleString("fr-FR")}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
