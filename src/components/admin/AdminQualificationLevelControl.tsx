"use client";

import { useEffect, useState } from "react";
import type { QualificationLevel } from "@/lib/qualification-tiers";

const ACTIVE_LEVELS = [
  { value: 1 as const, label: "1 — Certifié" },
  { value: 2 as const, label: "2 — Qualifié" },
  { value: 3 as const, label: "3 — Premium" },
];

interface Props {
  proId: string;
  companyName: string;
  status: "pending" | "approved" | "rejected";
  qualificationLevel?: QualificationLevel;
  onSaved: () => void | Promise<void>;
  /** Affiche aussi le bouton de démotivation (fraude). */
  showDemote?: boolean;
}

function resolveActiveLevel(
  status: Props["status"],
  qualificationLevel?: QualificationLevel
): 1 | 2 | 3 {
  if (status === "rejected") return 1;
  if (qualificationLevel === 2 || qualificationLevel === 3) return qualificationLevel;
  return 1;
}

/**
 * Contrôle simple du niveau affiché (1 / 2 / 3) + option niveau 0 séparée.
 */
export default function AdminQualificationLevelControl({
  proId,
  companyName,
  status,
  qualificationLevel,
  onSaved,
  showDemote = true,
}: Props) {
  const saved = resolveActiveLevel(status, qualificationLevel);
  const [draft, setDraft] = useState<1 | 2 | 3>(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(resolveActiveLevel(status, qualificationLevel));
  }, [status, qualificationLevel, proId]);

  const dirty = status !== "rejected" && draft !== saved;
  const needsReinstate = status === "rejected";

  async function saveLevel() {
    if (!needsReinstate && !dirty) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/professionnels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proId, qualificationLevel: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Enregistrement impossible.");
        return;
      }
      setMessage(needsReinstate ? "Compte réintégré." : "Niveau enregistré.");
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function demoteToZero() {
    const ok = window.confirm(
      `Renvoyer « ${companyName} » au niveau 0 ?\n\nLe compte sera refusé, la certification retirée, et la connexion bloquée.`
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
      setMessage("Compte renvoyé au niveau 0.");
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="text-xs font-medium text-slate-600">
        Niveau artisan
        <select
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(Number(e.target.value) as 1 | 2 | 3)}
          className="mt-1 block min-w-[11rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
        >
          {ACTIVE_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={busy || (!dirty && !needsReinstate)}
        onClick={() => void saveLevel()}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {busy
          ? "Enregistrement…"
          : needsReinstate
            ? "Réintégrer à ce niveau"
            : "Enregistrer le niveau"}
      </button>

      {showDemote && status !== "rejected" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void demoteToZero()}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Renvoyer au niveau 0
        </button>
      )}

      {dirty && !needsReinstate && (
        <p className="max-w-[12rem] text-right text-xs text-amber-700">
          Modification non enregistrée.
        </p>
      )}
      {needsReinstate && (
        <p className="max-w-[12rem] text-right text-xs text-red-700">
          Compte au niveau 0 — choisissez un niveau puis réintégrez.
        </p>
      )}
      {message && (
        <p className="max-w-[12rem] text-right text-xs text-emerald-700">{message}</p>
      )}
    </div>
  );
}
