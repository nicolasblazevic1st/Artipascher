"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  label: string;
  className?: string;
}

export default function AdminImpersonateClientButton({
  clientId,
  label,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/impersonate-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const data = (await res.json()) as {
      error?: string;
      redirectTo?: string;
    };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Connexion impossible.");
      return;
    }
    window.location.href = data.redirectTo ?? "/particulier/espace";
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={`Ouvrir l'espace de ${label}`}
        className={
          className ??
          "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        }
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
