import type { Metadata } from "next";
import { Suspense } from "react";
import ClientRegisterForm from "@/components/client/ClientRegisterForm";

export const metadata: Metadata = {
  title: "Créer un compte particulier",
};

export default function ClientRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-client-600 text-sm font-bold text-white">
            AP
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Créer un compte</h1>
            <p className="text-sm text-slate-600">
              Ensuite, créez votre demande de travaux depuis votre espace.
            </p>
          </div>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
          <ClientRegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
