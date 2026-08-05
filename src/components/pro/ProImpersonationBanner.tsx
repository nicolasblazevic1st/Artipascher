"use client";

import { useState } from "react";

interface Props {
  companyName: string;
  status: string;
}

export default function ProImpersonationBanner({ companyName, status }: Props) {
  const [loading, setLoading] = useState(false);

  async function endImpersonation() {
    setLoading(true);
    const res = await fetch("/api/admin/end-pro-impersonation", { method: "POST" });
    const data = (await res.json()) as { redirectTo?: string };
    setLoading(false);
    window.location.href = data.redirectTo ?? "/admin/comptes-artisans";
  }

  return (
    <div className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold">Mode admin</span> — vous consultez l&apos;espace de{" "}
          <strong>{companyName}</strong>
          {status !== "approved" ? ` (statut : ${status})` : ""}.
        </p>
        <button
          type="button"
          onClick={endImpersonation}
          disabled={loading}
          className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
        >
          {loading ? "Retour…" : "Retour à l'admin"}
        </button>
      </div>
    </div>
  );
}
