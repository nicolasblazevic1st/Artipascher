import type { Metadata } from "next";
import Link from "next/link";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import WorkRequestForm from "@/components/WorkRequestForm";
import { getIsBetaMode } from "@/lib/beta-server";
import { getClientSession } from "@/lib/client-auth";
import { getClientById } from "@/lib/store";
import { resolveWorkCategoryFromAdsQuery } from "@/lib/work-categories";

export const metadata: Metadata = {
  title: "Demande de travaux — Sans compte obligatoire",
  description:
    "Décrivez votre chantier en 2 minutes. Des artisans du Nord et du Pas-de-Calais vous recontactent. Gratuit, sans compte.",
  alternates: { canonical: "/particulier/demande" },
};

export default async function PublicDemandePage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    utm_content?: string;
    utm_term?: string;
    keyword?: string;
  }>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getClientSession(),
  ]);
  const { category: categoryParam, utm_content, utm_term, keyword } = params;
  const resolvedCategory = resolveWorkCategoryFromAdsQuery({
    category: categoryParam,
    utmContent: utm_content,
    utmTerm: utm_term,
    keyword,
  });
  const client = session ? await getClientById(session.clientId) : null;
  const loggedIn = Boolean(session && client);

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
              guestMode={!loggedIn}
              successHref={
                loggedIn ? "/particulier/espace/demandes" : "/particulier"
              }
              initialCategory={resolvedCategory}
              defaults={
                loggedIn && client
                  ? {
                      firstName: client.firstName ?? session?.firstName ?? "",
                      lastName: client.lastName ?? session?.lastName ?? "",
                      email: client.email ?? session?.email ?? "",
                      phone: client.phone,
                      phoneVerifiedE164: client.phoneVerifiedE164,
                      phoneVerifiedAt: client.phoneVerifiedAt,
                    }
                  : undefined
              }
            />
          </div>
        )}

        {!loggedIn ? (
          <p className="mt-6 text-center text-sm text-slate-600">
            Déjà un compte ?{" "}
            <Link
              href="/particulier/espace/login?from=/particulier/espace/demandes/nouvelle"
              className="font-medium text-brand-700 underline"
            >
              Se connecter
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
