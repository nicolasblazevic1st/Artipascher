"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { isBetaMode } from "@/lib/beta";

export default function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const from =
    fromParam &&
    fromParam.startsWith("/particulier/espace") &&
    !fromParam.startsWith("/particulier/espace/inscription") &&
    !fromParam.startsWith("/particulier/espace/login")
      ? fromParam
      : "/particulier/espace";
  const resetSuccess = searchParams.get("reset") === "1";
  const verifiedSuccess = searchParams.get("verified") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    setResendMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const emailValue = String(formData.get("email") ?? email).trim();
    const passwordValue = String(formData.get("password") ?? password);

    if (!emailValue || !passwordValue) {
      setError("Email et mot de passe requis.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/client/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailValue, password: passwordValue }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Connexion impossible.");
      if (data.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
        if (data.email) setEmail(data.email);
      }
      setLoading(false);
      return;
    }

    router.push(from.startsWith("/particulier/espace") ? from : "/particulier/espace");
    router.refresh();
  }

  async function handleResend() {
    if (!email.trim()) return;
    setResending(true);
    setResendMessage(null);
    const res = await fetch("/api/client/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setResending(false);
    setResendMessage(data.message ?? data.error ?? "Email renvoyé.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {resetSuccess && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Votre mot de passe a été réinitialisé. Connectez-vous avec votre nouveau mot de passe.
        </p>
      )}
      {verifiedSuccess && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Email confirmé. Vous pouvez vous connecter.
        </p>
      )}
      <div>
        <label htmlFor="client-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="client-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="votre@email.fr"
          required
          autoFocus
          autoComplete="email"
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="client-password" className="text-sm font-medium text-slate-700">
            Mot de passe
          </label>
          <Link
            href="/particulier/espace/mot-de-passe-oublie"
            className="text-xs font-medium text-client-600 hover:text-client-700"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          id="client-password"
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
        <div className="space-y-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{error}</p>
          {needsVerification && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-client-700 underline hover:text-client-800 disabled:opacity-50"
            >
              {resending ? "Envoi…" : "Renvoyer l'email de confirmation"}
            </button>
          )}
        </div>
      )}
      {resendMessage && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {resendMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-client-600 py-2.5 text-sm font-semibold text-white hover:bg-client-700 disabled:opacity-50"
      >
        {loading ? "Connexion…" : "Accéder à mon espace"}
      </button>

      <p className="text-center text-sm text-slate-500">
        {isBetaMode() ? (
          <>Inscriptions fermées — version bêta (préouverture).</>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link
              href={`/particulier/espace/inscription?from=${encodeURIComponent(
                "/particulier/espace/demandes/nouvelle"
              )}`}
              className="font-medium text-client-600 hover:text-client-700"
            >
              Créer un compte
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
