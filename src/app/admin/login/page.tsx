import type { Metadata } from "next";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Connexion administrateur",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Artipascher — validation artisans RCS et demandes travaux Nord
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Accès réservé aux administrateurs Artipascher.
        </p>
      </div>
    </div>
  );
}
