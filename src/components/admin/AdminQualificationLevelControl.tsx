"use client";

import { useState } from "react";
import type { QualificationLevel } from "@/lib/qualification-tiers";

interface Props {
  proId: string;
  companyName: string;
  status: "pending" | "approved" | "rejected";
  qualificationLevel?: QualificationLevel;
  onSaved: () => void | Promise<void>;
  /** Affiche aussi le bouton de démotivation (fraude). */
  showDemote?: boolean;
}

/**
 * Certification binaire : certifié (niveau 1) ou retiré (niveau 0).
 */
export default function AdminQualificationLevelControl({
  proId,
  companyName,
  status,
  onSaved,
  showDemote = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const needsReinstate = status === "rejected";

  async function reinstate() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/professionnels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proId, qualificationLevel: 1 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Enregistrement impossible.");
        return;
      }
      setMessage("Compte réintégré (certifié).");
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function demoteToZero() {
    const ok = window.confirm(
      `Retirer la certification de « ${companyName} » ?\n\nLe compte sera refusé et la connexion bloquée.`
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/professionnels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proId, qualificationLevel: 0 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Action impossible.");
        return;
      }
      setMessage("Certification retirée.");
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-600">Certification</p>

      {needsReinstate ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void reinstate()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? "Enregistrement…" : "Réintégrer (certifié)"}
        </button>
      ) : (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
          Certifié
        </span>
      )}

      {showDemote && status !== "rejected" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void demoteToZero()}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Retirer la certification
        </button>
      )}

      {needsReinstate && (
        <p className="max-w-[12rem] text-right text-xs text-red-700">
          Certification retirée — réintégrez pour rétablir l&apos;accès.
        </p>
      )}
      {message && (
        <p className="max-w-[12rem] text-right text-xs text-emerald-700">{message}</p>
      )}
    </div>
  );
}
