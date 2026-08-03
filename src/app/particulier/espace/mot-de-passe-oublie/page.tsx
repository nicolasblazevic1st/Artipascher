import type { Metadata } from "next";
import { Suspense } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié — particulier",
};

export default function ClientForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-client-600 text-sm font-bold text-white">
            AP
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mot de passe oublié</h1>
            <p className="text-sm text-slate-600">Espace particulier</p>
          </div>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Saisissez l&apos;email de votre compte. Nous vous enverrons un lien pour choisir un
          nouveau mot de passe.
        </p>
        <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
          <ForgotPasswordForm userType="client" />
        </Suspense>
      </div>
    </div>
  );
}
