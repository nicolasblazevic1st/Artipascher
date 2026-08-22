import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import WorkRequestForm from "@/components/WorkRequestForm";
import { getIsBetaMode } from "@/lib/beta-server";
import { getClientSession } from "@/lib/client-auth";

export const metadata: Metadata = {
  title: "Demande de travaux — Sans compte obligatoire",
  description:
    "Décrivez votre chantier en 2 minutes. Des artisans du Nord et du Pas-de-Calais vous recontactent. Gratuit, sans compte.",
};

export default async function PublicDemandePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category: categoryParam }, session] = await Promise.all([
    searchParams,
    getClientSession(),
  ]);
  if (session) {
    const q = categoryParam
      ? `?category=${encodeURIComponent(categoryParam)}`
      : "";
    redirect(`/particulier/espace/demandes/nouvelle${q}`);
  }

  const beta = await getIsBetaMode();

  return (
    <div className="bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <p className="text-sm text-slate-600">
          <Link href="/particulier" className="font-medium text-brand-700 hover:underline">
            ← Espace particulier
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Décrivez votre projet
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Gratuit, sans compte. Des artisans du Nord et du Pas-de-Calais vous
          recontactent — en général sous 24&nbsp;h.
        </p>

        {beta ? (
          <div className="mt-8">
            <BetaClosedNotice title="Création de demandes fermée" />
          </div>
        ) : (
          <div className="mt-8">
            <WorkRequestForm
              guestMode
              successHref="/particulier"
              initialCategory={categoryParam}
            />
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Déjà un compte ?{" "}
          <Link
            href="/particulier/espace/login?from=/particulier/espace/demandes/nouvelle"
            className="font-medium text-brand-700 underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
