import type { Metadata } from "next";
import Link from "next/link";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import WorkRequestForm from "@/components/WorkRequestForm";
import WorkRequestLandingIntro from "@/components/WorkRequestLandingIntro";
import { getIsBetaMode } from "@/lib/beta-server";
import { getClientSession } from "@/lib/client-auth";
import { getClientById } from "@/lib/store";
import {
  adsWorkQueryFromParams,
  resolveAdsFormPrefill,
  WORK_CATEGORIES,
} from "@/lib/work-categories";

export const metadata: Metadata = {
  title: "Formulaire de travaux — Nord et Pas-de-Calais",
  description:
    "Remplissez le formulaire, même si vous ne savez pas le métier. Des artisans vérifiés du 59 et du 62 vous recontactent. Gratuit, sans commission.",
  alternates: { canonical: "/travaux" },
  keywords: [
    "travaux",
    "devis travaux",
    "artisan Nord",
    "travaux 59",
    "travaux 62",
    "demande de travaux Grande-Synthe",
    "travaux Dunkerque",
    "travaux Lille",
  ],
};

export default async function TravauxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getClientSession(),
  ]);
  const ads = adsWorkQueryFromParams(params);
  const prefill = resolveAdsFormPrefill(ads);
  const client = session ? await getClientById(session.clientId) : null;
  const loggedIn = Boolean(session && client);
  const beta = await getIsBetaMode();

  return (
    <div className="bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <p className="text-sm font-medium text-brand-700">Travaux · 59 / 62</p>
        <div className="mt-2">
          <WorkRequestLandingIntro heading="Remplissez le formulaire de travaux">
            {prefill.category
              ? `Métier déjà coché : ${prefill.category}. Gratuit, sans commission. Des professionnels vérifiés du Nord et du Pas-de-Calais vous recontactent — en général sous 24–48 h.`
              : prefill.unknownTrade
                ? "Vous cherchez un artisan sans métier précis : « Je ne sais pas / plusieurs métiers » est déjà sélectionné. Gratuit, sans commission — en général sous 24–48 h."
                : "Peinture, plomberie, toiture ou plusieurs choses à la fois : un seul formulaire. Gratuit, sans commission. Des professionnels vérifiés du Nord et du Pas-de-Calais vous recontactent — en général sous 24–48 h."}
          </WorkRequestLandingIntro>
        </div>

        {beta ? (
          <div className="mt-8">
            <BetaClosedNotice title="Création de demandes fermée" />
          </div>
        ) : (
          <div id="formulaire" className="mt-8">
            <WorkRequestForm
              guestMode={!loggedIn}
              successHref={
                loggedIn ? "/particulier/espace/demandes" : "/particulier"
              }
              variant="general"
              initialCategory={prefill.category}
              initialUnknownTrade={prefill.unknownTrade}
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

        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Tous types de travaux
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Vous connaissez déjà le métier ? Même formulaire, catégorie déjà cochée.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {WORK_CATEGORIES.map((category) => (
              <li key={category}>
                <Link
                  href={`/travaux?category=${encodeURIComponent(category)}#formulaire`}
                  className="inline-block rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand-300 hover:text-brand-800"
                >
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </section>

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
