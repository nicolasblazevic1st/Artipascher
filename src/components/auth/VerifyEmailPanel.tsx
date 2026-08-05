"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type UserType = "client" | "pro";

interface Props {
  userType: UserType;
}

const config: Record<
  UserType,
  {
    verifyApi: string;
    resendApi: string;
    loginPath: string;
    accentClass: string;
    buttonClass: string;
  }
> = {
  client: {
    verifyApi: "/api/client/verify-email",
    resendApi: "/api/client/resend-verification",
    loginPath: "/particulier/espace/login",
    accentClass: "text-client-600 hover:text-client-700",
    buttonClass: "bg-client-600 hover:bg-client-700",
  },
  pro: {
    verifyApi: "/api/pro/verify-email",
    resendApi: "/api/pro/resend-verification",
    loginPath: "/pro/login",
    accentClass: "text-brand-600 hover:text-brand-700",
    buttonClass: "bg-brand-600 hover:bg-brand-700",
  },
};

export default function VerifyEmailPanel({ userType }: Props) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { verifyApi, resendApi, loginPath, accentClass, buttonClass } = config[userType];

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "idle"
  );
  const [error, setError] = useState<string | null>(
    token ? null : "Lien de vérification manquant ou invalide."
  );
  const [email, setEmail] = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      const res = await fetch(verifyApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Vérification impossible.");
        return;
      }
      setStatus("success");
    })();

    return () => {
      cancelled = true;
    };
  }, [token, verifyApi]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResending(true);
    setResendMessage(null);
    setError(null);
    const res = await fetch(resendApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as { error?: string; message?: string };
    setResending(false);
    if (!res.ok) {
      setError(data.error ?? "Envoi impossible.");
      return;
    }
    setResendMessage(data.message ?? "Email renvoyé.");
  }

  if (status === "loading") {
    return <p className="text-sm text-slate-500">Vérification de votre email…</p>;
  }

  if (status === "success") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Email confirmé. Vous pouvez vous connecter à votre espace.
        </p>
        <Link
          href={`${loginPath}?verified=1`}
          className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold text-white ${buttonClass}`}
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <p className="text-sm text-slate-600">
        Vous pouvez demander un nouveau lien de confirmation :
      </p>
      <form onSubmit={handleResend} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="votre@email.fr"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={resending}
          className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${buttonClass}`}
        >
          {resending ? "Envoi…" : "Renvoyer l'email"}
        </button>
      </form>
      {resendMessage && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {resendMessage}
        </p>
      )}
      <p className="text-center text-sm text-slate-500">
        <Link href={loginPath} className={`font-medium ${accentClass}`}>
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
