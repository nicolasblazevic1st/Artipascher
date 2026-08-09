"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ClientRegisterForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/particulier/espace/demandes";
  const loginHref = `/particulier/espace/login?from=${encodeURIComponent(
    from.startsWith("/particulier/espace") ? from : "/particulier/espace/demandes"
  )}`;

  const [firstName, setFirstName] = useState(
    () => searchParams.get("firstName")?.trim() ?? ""
  );
  const [lastName, setLastName] = useState(
    () => searchParams.get("lastName")?.trim() ?? ""
  );
  const [email, setEmail] = useState(() => searchParams.get("email")?.trim() ?? "");
  const [phone, setPhone] = useState(() => searchParams.get("phone")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/client/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone: phone.trim() || undefined,
        password,
        passwordConfirm,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Inscription impossible.");
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          Compte créé. Un email de confirmation vient de vous être envoyé. Validez
          votre adresse, puis connectez-vous pour suivre vos demandes (y compris
          celles déjà envoyées avec le même email).
        </p>
        <Link
          href={loginHref}
          className="inline-block rounded-lg bg-client-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-client-700"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-firstName" className="mb-1 block text-sm font-medium text-slate-700">
            Prénom
          </label>
          <input
            id="reg-firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            required
            autoComplete="given-name"
          />
        </div>
        <div>
          <label htmlFor="reg-lastName" className="mb-1 block text-sm font-medium text-slate-700">
            Nom
          </label>
          <input
            id="reg-lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            required
            autoComplete="family-name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="votre@email.fr"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="reg-phone" className="mb-1 block text-sm font-medium text-slate-700">
          Téléphone <span className="font-normal text-slate-400">(optionnel)</span>
        </label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="06 12 34 56 78"
          autoComplete="tel"
        />
      </div>

      <div>
        <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-slate-700">
          Mot de passe
        </label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="Min. 8 caractères, lettre + chiffre"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label
          htmlFor="reg-passwordConfirm"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Confirmer le mot de passe
        </label>
        <input
          id="reg-passwordConfirm"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="Retapez le mot de passe"
          required
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-client-600 py-2.5 text-sm font-semibold text-white hover:bg-client-700 disabled:opacity-50"
      >
        {loading ? "Création…" : "Créer mon compte"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Déjà un compte ?{" "}
        <Link href={loginHref} className="font-medium text-client-600 hover:text-client-700">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
