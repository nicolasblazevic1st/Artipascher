import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmailPanel from "@/components/auth/VerifyEmailPanel";

export const metadata: Metadata = {
  title: "Vérifier l'email — particulier",
};

export default function ClientVerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-client-600 text-sm font-bold text-white">
            AP
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vérifier votre email</h1>
            <p className="text-sm text-slate-600">Espace particulier</p>
          </div>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
          <VerifyEmailPanel userType="client" />
        </Suspense>
      </div>
    </div>
  );
}
