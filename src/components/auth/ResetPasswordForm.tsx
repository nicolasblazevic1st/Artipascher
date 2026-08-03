"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
  }
> = {
  client: {
    apiPath: "/api/client/reset-password",
    loginPath: "/particulier/espace/login",
    accentClass: "text-client-600 hover:text-client-700",
  },
  pro: {
    apiPath: "/api/pro/reset-password",
    loginPath: "/pro/login",
    accentClass: "text-brand-600 hover:text-brand-700",
  },
};

export default function ResetPasswordForm({ userType }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const { apiPath, loginPath, accentClass } = config[userType];
  const buttonClass =
    userType === "client"
      ? "bg-client-600 hover:bg-client-700"
      : "bg-brand-600 hover:bg-brand-700";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Lien de réinitialisation invalide. Demandez un nouveau lien.
        </p>
        <p className="text-center text-sm text-slate-500">
          <Link href={loginPath} className={`font-medium ${accentClass}`}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Réinitialisation impossible.");
      setLoading(false);
      return;
    }

    router.push(`${loginPath}?reset=1`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
          Nouveau mot de passe
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="8 caractères min., lettre et chiffre"
          required
          autoFocus
          autoComplete="new-password"
          minLength={8}
        />
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="Retapez le mot de passe"
          required
          autoComplete="new-password"
          minLength={8}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${buttonClass}`}
      >
        {loading ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
      </button>

      <p className="text-center text-sm text-slate-500">
        <Link href={loginPath} className={`font-medium ${accentClass}`}>
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
