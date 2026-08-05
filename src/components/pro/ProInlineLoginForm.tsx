"use client";

import { useState } from "react";

interface Props {
  onSuccess?: (companyName: string) => void;
  compact?: boolean;
}

export default function ProInlineLoginForm({ onSuccess, compact = false }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/pro/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(
        data.code === "EMAIL_NOT_VERIFIED"
          ? `${data.error ?? "Email non vérifié."} Renvoyez le lien depuis /pro/login.`
          : (data.error ?? "Connexion impossible.")
      );
      setLoading(false);
      return;
    }

    onSuccess?.(data.companyName ?? "");
    setLoading(false);
  }

  const inputClass = compact
    ? "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
    : "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-medium text-slate-700">
        Connexion artisan (compte approuvé)
      </p>
      <input
        type="email"
        placeholder="Email professionnel"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
        required
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
        required
        autoComplete="current-password"
      />
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
