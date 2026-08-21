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
    "Publiez votre demande de travaux dans le Nord-Pas-de-Calais. Compte optionnel pour suivre vos demandes.",
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
          Demande de travaux
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Aucun compte requis pour publier. Créez-en un ensuite si vous souhaitez
          suivre vos demandes dans votre espace.
        </p>

        {beta ? (
          <div className="mt-8">
            <BetaClosedNotice title="Création de demandes fermée" />
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
