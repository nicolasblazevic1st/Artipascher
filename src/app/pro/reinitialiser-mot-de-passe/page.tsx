import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe — professionnel",
};

export default function ProResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            AP
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
            <p className="text-sm text-slate-600">Espace pro</p>
          </div>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Choisissez un nouveau mot de passe pour votre compte (8 caractères minimum, avec une
          lettre et un chiffre).
        </p>
        <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
          <ResetPasswordForm userType="pro" />
        </Suspense>
      </div>
    </div>
  );
}
