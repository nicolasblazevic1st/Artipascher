"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ProLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/pro";
  const resetSuccess = searchParams.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const emailValue = String(formData.get("email") ?? email).trim();
    const passwordValue = String(formData.get("password") ?? password);

    if (!emailValue || !passwordValue) {
      setError("Email et mot de passe requis.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/pro/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailValue, password: passwordValue }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Connexion impossible.");
      setLoading(false);
      return;
    }

    router.push(from.startsWith("/pro") ? from : "/pro");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {resetSuccess && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Votre mot de passe a été réinitialisé. Connectez-vous avec votre nouveau mot de passe.
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email professionnel
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="contact@mon-entreprise.fr"
          required
          autoFocus
          autoComplete="email"
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Mot de passe
          </label>
          <Link
            href="/pro/mot-de-passe-oublie"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="Votre mot de passe"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Connexion…" : "Accéder à mon espace"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Pas encore inscrit ?{" "}
        <Link href="/professionnel" className="font-medium text-brand-600 hover:text-brand-700">
          Créer un compte pro
        </Link>
      </p>
    </form>
  );
}
