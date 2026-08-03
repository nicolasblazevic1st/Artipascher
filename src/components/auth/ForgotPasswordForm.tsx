"use client";

import { useState } from "react";
import Link from "next/link";

type UserType = "client" | "pro";

interface Props {
  userType: UserType;
}

const config: Record<
  UserType,
  {
    apiPath: string;
    loginPath: string;
    accentClass: string;
    emailLabel: string;
    emailPlaceholder: string;
  }
> = {
  client: {
    apiPath: "/api/client/forgot-password",
    loginPath: "/particulier/espace/login",
    accentClass: "text-client-600 hover:text-client-700",
    emailLabel: "Email",
    emailPlaceholder: "votre@email.fr",
  },
  pro: {
    apiPath: "/api/pro/forgot-password",
    loginPath: "/pro/login",
    accentClass: "text-brand-600 hover:text-brand-700",
    emailLabel: "Email professionnel",
    emailPlaceholder: "contact@mon-entreprise.fr",
  },
};

export default function ForgotPasswordForm({ userType }: Props) {
  const { apiPath, loginPath, accentClass, emailLabel, emailPlaceholder } = config[userType];
  const buttonClass =
    userType === "client"
      ? "bg-client-600 hover:bg-client-700"
      : "bg-brand-600 hover:bg-brand-700";

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    setSuccess(
      data.message ??
        "Si un compte existe avec cet email, un message de réinitialisation vient d'être envoyé."
    );
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-slate-700">
          {emailLabel}
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder={emailPlaceholder}
          required
          autoFocus
          autoComplete="email"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{success}</p>
      )}

      <button
        type="submit"
        disabled={loading || !!success}
        className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${buttonClass}`}
      >
        {loading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
      </button>

      <p className="text-center text-sm text-slate-500">
        <Link href={loginPath} className={`font-medium ${accentClass}`}>
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
