"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import GoogleSignInButton, {
  GoogleAuthDivider,
  googleAuthHref,
} from "@/components/GoogleSignInButton";
import {
  formatFrenchPhoneDisplay,
  normalizeFrenchMobile,
} from "@/lib/phone-format";

export default function ClientRegisterForm({
  googleEnabled = false,
}: {
  googleEnabled?: boolean;
}) {
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

  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [phoneVerifiedE164, setPhoneVerifiedE164] = useState("");

  const phoneE164 = normalizeFrenchMobile(phone);
  const phoneVerified =
    Boolean(phoneE164) &&
    Boolean(phoneVerifiedE164) &&
    phoneE164 === phoneVerifiedE164;

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = window.setTimeout(() => setOtpCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [otpCooldown]);

  function handlePhoneChange(value: string) {
    setPhone(value);
    const next = normalizeFrenchMobile(value);
    if (!next || next !== phoneVerifiedE164) {
      setPhoneVerifiedE164("");
      setOtpCode("");
      setOtpMessage(null);
    }
  }

  async function sendPhoneOtp() {
    setOtpMessage(null);
    setError(null);
    if (!phoneE164) {
      setError("Indiquez un mobile français valide (06 ou 07).");
      return;
    }
    setOtpSending(true);
    const res = await fetch("/api/guest/phone-verification/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = (await res.json()) as {
      error?: string;
      cooldownSeconds?: number;
      demo?: boolean;
      phoneDisplay?: string;
    };
    setOtpSending(false);
    if (!res.ok) {
      if (res.status === 409) {
        // Déjà vérifié côté guest (ex. demande récente) — on accepte.
        setPhoneVerifiedE164(phoneE164);
        setOtpMessage("✓ Mobile déjà vérifié.");
        return;
      }
      setError(data.error ?? "Impossible d'envoyer le SMS.");
      if (data.cooldownSeconds) setOtpCooldown(data.cooldownSeconds);
      return;
    }
    setOtpCooldown(data.cooldownSeconds ?? 60);
    setOtpMessage(
      data.demo
        ? `Code envoyé (mode démo) vers ${data.phoneDisplay ?? phone}.`
        : `Code envoyé par SMS vers ${data.phoneDisplay ?? phone}.`
    );
  }

  async function verifyPhoneOtp() {
    setOtpMessage(null);
    setError(null);
    if (!phoneE164 || otpCode.length !== 6) return;
    setOtpVerifying(true);
    const res = await fetch("/api/guest/phone-verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: otpCode }),
    });
    const data = (await res.json()) as {
      error?: string;
      phoneVerifiedE164?: string;
    };
    setOtpVerifying(false);
    if (!res.ok) {
      setError(data.error ?? "Code invalide.");
      return;
    }
    setPhoneVerifiedE164(data.phoneVerifiedE164 ?? phoneE164);
    setOtpMessage("✓ Mobile vérifié");
    setOtpCode("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      setLoading(false);
      return;
    }

    if (!phoneE164) {
      setError("Indiquez un mobile français valide (06 ou 07).");
      setLoading(false);
      return;
    }

    if (!phoneVerified) {
      setError("Vérifiez votre mobile par SMS avant de créer le compte.");
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
        phone: phoneE164,
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
          Compte créé. Votre mobile est vérifié. Un email de confirmation vient
          de vous être envoyé : validez votre adresse, puis connectez-vous pour
          suivre vos demandes.
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
      {googleEnabled && (
        <>
          <GoogleSignInButton
            href={googleAuthHref(
              "client",
              from.startsWith("/particulier/espace")
                ? from
                : "/particulier/espace"
            )}
            label="Créer mon compte avec Google"
          />
          <p className="text-center text-xs text-slate-500">
            Le mobile reste à vérifier par SMS pour publier une demande.
          </p>
          <GoogleAuthDivider />
        </>
      )}
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
          Mobile <span className="text-red-500">*</span>
        </label>
        <input
          id="reg-phone"
          type="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          placeholder="06 12 34 56 78"
          required
          autoComplete="tel"
        />
        <p className="mt-1 text-xs text-slate-500">
          Mobile français (06/07) obligatoire — un code SMS de vérification vous
          sera envoyé.
        </p>
        {phoneVerified ? (
          <p className="mt-2 text-sm font-medium text-emerald-700">
            ✓ Mobile vérifié
            {phoneE164 ? ` — ${formatFrenchPhoneDisplay(phoneE164)}` : ""}
          </p>
        ) : (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void sendPhoneOtp()}
                disabled={otpSending || otpCooldown > 0 || !phoneE164}
                className="rounded-lg bg-client-600 px-3 py-2 text-xs font-semibold text-white hover:bg-client-700 disabled:opacity-50"
              >
                {otpSending
                  ? "Envoi…"
                  : otpCooldown > 0
                    ? `Renvoyer (${otpCooldown}s)`
                    : "Recevoir un code"}
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Code à 6 chiffres"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="min-w-[9rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void verifyPhoneOtp()}
                disabled={otpVerifying || otpCode.length !== 6}
                className="rounded-lg border border-client-600 px-3 py-2 text-xs font-semibold text-client-700 hover:bg-client-50 disabled:opacity-50"
              >
                {otpVerifying ? "Vérif…" : "Vérifier"}
              </button>
            </div>
            {otpMessage && (
              <p className="text-xs text-emerald-700">{otpMessage}</p>
            )}
          </div>
        )}
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
        disabled={loading || !phoneVerified}
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
