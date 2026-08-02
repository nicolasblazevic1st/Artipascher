import type { Metadata } from "next";
import { Suspense } from "react";
import ProLoginForm from "@/components/pro/ProLoginForm";

export const metadata: Metadata = {
  title: "Connexion professionnel",
};

export default function ProLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            AP
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Espace pro</h1>
            <p className="text-sm text-slate-600">Artisans RCS · Nord 59/62</p>
          </div>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Connectez-vous avec l&apos;email et le mot de passe définis lors de votre inscription
          (compte approuvé par l&apos;administrateur).
        </p>
        <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
          <ProLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
