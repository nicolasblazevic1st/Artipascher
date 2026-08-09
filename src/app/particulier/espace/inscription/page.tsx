import type { Metadata } from "next";
import { Suspense } from "react";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import ClientRegisterForm from "@/components/client/ClientRegisterForm";
import { getIsBetaMode } from "@/lib/beta-server";

export const metadata: Metadata = {
  title: "Créer un compte particulier",
};

export default async function ClientRegisterPage() {
  const beta = await getIsBetaMode();

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
              Optionnel pour publier une demande — utile pour les retrouver et
              les suivre.
            </p>
          </div>
        </div>
        {beta ? (
          <BetaClosedNotice title="Inscriptions temporairement fermées" />
        ) : (
          <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
            <ClientRegisterForm />
          </Suspense>
        )}
      </div>
    </div>
  );
}
