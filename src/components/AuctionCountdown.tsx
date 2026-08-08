"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function splitRemaining(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

/**
 * Compte à rebours jusqu'à la fin d'une enchère.
 */
export default function AuctionCountdown({
  endsAt,
  compact = false,
  className = "",
}: {
  endsAt: string | undefined | null;
  compact?: boolean;
  className?: string;
}) {
  const endMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const valid = Number.isFinite(endMs);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!valid) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [valid, endsAt]);

  if (!valid) {
    return (
      <div
        className={`rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 ${className}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Temps restant
        </p>
        <p className="mt-1 text-sm font-semibold">Date de fin non disponible</p>
      </div>
    );
  }

  const remaining = endMs - now;
  const ended = remaining <= 0;
  const urgent = !ended && remaining < 24 * 60 * 60 * 1000;
  const { days, hours, minutes, seconds } = splitRemaining(remaining);

  if (compact) {
    return (
      <p
        className={`text-sm font-bold tabular-nums ${
          ended
            ? "text-slate-500"
            : urgent
              ? "text-amber-700"
              : "text-emerald-700"
        } ${className}`}
        role="timer"
        aria-live="polite"
      >
        {ended
          ? "Enchère terminée"
          : days > 0
            ? `Fin dans ${days}j ${pad(hours)}h ${pad(minutes)}m`
            : `Fin dans ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 shadow-sm ${
        ended
          ? "border-slate-300 bg-slate-50 text-slate-700"
          : urgent
            ? "border-amber-400 bg-amber-50 text-amber-950"
            : "border-emerald-400 bg-emerald-50 text-emerald-950"
      } ${className}`}
      role="timer"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {ended ? "Enchère terminée" : "Compte à rebours — temps restant"}
      </p>
      {ended ? (
        <p className="mt-1 text-sm font-semibold">
          Clôturée le{" "}
          {new Date(endMs).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-3 tabular-nums sm:gap-4">
          {days > 0 && (
            <Unit value={days} label={days > 1 ? "jours" : "jour"} />
          )}
          <Unit value={hours} label="h" />
          <Unit value={minutes} label="min" />
          <Unit value={seconds} label="s" />
        </div>
      )}
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold leading-none sm:text-3xl">
        {pad(value)}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase opacity-70">
        {label}
      </p>
    </div>
  );
}
