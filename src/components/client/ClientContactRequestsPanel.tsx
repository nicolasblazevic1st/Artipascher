"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatAcceptedArtisanSlots,
  isAcceptSlotsFull,
  MAX_ACCEPTED_ARTISANS_PER_AUCTION,
} from "@/lib/contact-slots";

interface InterestItem {
  id: string;
  status: "pending" | "accepted" | "refused" | "expired";
  createdAt: string;
  expiresAt: string;
  clientRecallUsed: boolean;
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

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Délai écoulé";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h} h ${String(m).padStart(2, "0")} min restantes`;
  }
  if (m > 0) {
    return `${m} min ${String(s).padStart(2, "0")} s restantes`;
  }
  return `${s} s restantes`;
}

function RemainingCountdown({
  expiresAt,
  onExpired,
}: {
  expiresAt: string;
  onExpired: () => void;
}) {
  const [label, setLabel] = useState(() =>
    formatRemaining(new Date(expiresAt).getTime() - Date.now())
  );

  useEffect(() => {
    let expiredNotified = false;
    function tick() {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setLabel(formatRemaining(ms));
      if (ms <= 0 && !expiredNotified) {
        expiredNotified = true;
        onExpired();
      }
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpired]);

  const urgent =
    new Date(expiresAt).getTime() - Date.now() > 0 &&
    new Date(expiresAt).getTime() - Date.now() < 6 * 60 * 60 * 1000;

  return (
    <span
      className={`self-center text-xs font-medium tabular-nums ${
        urgent ? "text-amber-700" : "text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

export default function ClientContactRequestsPanel({ workRequestId }: Props) {
  const [items, setItems] = useState<InterestItem[]>([]);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [maxAccepted, setMaxAccepted] = useState(MAX_ACCEPTED_ARTISANS_PER_AUCTION);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/client/demandes/${workRequestId}/contact-requests`);
    const data = await res.json();
    if (res.ok) {
      setItems(data.items ?? []);
      setAcceptedCount(
        typeof data.acceptedArtisansCount === "number"
          ? data.acceptedArtisansCount
          : (data.items ?? []).filter(
              (i: InterestItem) => i.status === "accepted"
            ).length
      );
      if (typeof data.maxAcceptedArtisans === "number") {
        setMaxAccepted(data.maxAcceptedArtisans);
      }
    }
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

  async function recall(id: string) {
    setActingId(id);
    setError(null);
    const res = await fetch(`/api/client/contact-requests/${id}/recall`, {
      method: "POST",
    });
    const data = await res.json();
    setActingId(null);
    if (!res.ok) {
      setError(data.error ?? "Rappel impossible.");
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

  const slotsFull = isAcceptSlotsFull(acceptedCount, maxAccepted);

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Artisans intéressés</h2>
          <p className="mt-1 text-sm text-slate-600">
            Acceptez un artisan pour qu&apos;il puisse débloquer vos coordonnées
            (20&nbsp;€ · 1 crédit).
            Vous avez 48&nbsp;h pour répondre. Après un refus ou une expiration, vous pouvez
            rappeler un artisan une seule fois.
          </p>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold tabular-nums text-slate-800">
          {formatAcceptedArtisanSlots(acceptedCount, maxAccepted)} acceptés
        </p>
      </div>

      {slotsFull && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Plafond atteint ({maxAccepted} artisans acceptés). Vous ne pouvez plus en
          accepter de nouveaux.
        </p>
      )}

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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={actingId === item.id || slotsFull}
                  onClick={() => decide(item.id, "accepted")}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  title={
                    slotsFull
                      ? `Maximum ${maxAccepted} artisans déjà acceptés`
                      : undefined
                  }
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
                <RemainingCountdown expiresAt={item.expiresAt} onExpired={load} />
              </div>
            )}

            {(item.status === "refused" || item.status === "expired") &&
              !item.clientRecallUsed && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={actingId === item.id}
                    onClick={() => recall(item.id)}
                    className="rounded-lg bg-client-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-client-700 disabled:opacity-50"
                  >
                    Rappeler cet artisan
                  </button>
                  <span className="text-xs text-slate-500">
                    Une seule fois · nouveau délai de 48&nbsp;h
                  </span>
                </div>
              )}

            {(item.status === "refused" || item.status === "expired") &&
              item.clientRecallUsed && (
                <p className="mt-3 text-xs text-slate-500">
                  Rappel déjà utilisé pour cet artisan.
                </p>
              )}
          </li>
        ))}
      </ul>
    </section>
  );
}
