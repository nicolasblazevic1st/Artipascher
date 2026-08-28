import Link from "next/link";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import WorkRequestForm from "@/components/WorkRequestForm";
import WorkRequestLandingIntro from "@/components/WorkRequestLandingIntro";
import { getIsBetaMode } from "@/lib/beta-server";
import { getClientSession } from "@/lib/client-auth";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";
import { getClientById } from "@/lib/store";
import {
  adsWorkQueryFromParams,
  resolveAdsFormPrefill,
} from "@/lib/work-categories";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

export default async function WorkRequestPublicLanding({
  searchParams,
  showParticulierBackLink = false,
  formPath = WORK_REQUEST_FORM_PATH,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  showParticulierBackLink?: boolean;
  formPath?: string;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getClientSession(),
  ]);
  const prefill = resolveAdsFormPrefill(adsWorkQueryFromParams(params));
  const client = session ? await getClientById(session.clientId) : null;
  const loggedIn = Boolean(session && client);
  const beta = await getIsBetaMode();
  const googleEnabled = isGoogleOAuthConfigured();
  const googleError =
    typeof params.google === "string" ? params.google : null;
  const returnQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "google") continue;
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw) returnQuery.set(key, raw);
  }
  const googleReturnTo = returnQuery.toString()
    ? `${formPath}?${returnQuery.toString()}`
    : formPath;

  return (
    <div className="bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {showParticulierBackLink ? (
          <p className="text-sm text-slate-600">
            <Link
              href="/particulier"
              className="font-medium text-brand-700 hover:underline"
            >
              ← Espace particulier
            </Link>
          </p>
        ) : (
          <p className="text-sm font-medium text-brand-700">Travaux · 59 / 62</p>
        )}
        <div className={showParticulierBackLink ? "mt-4" : "mt-2"}>
          <WorkRequestLandingIntro heading="Remplissez le formulaire de travaux">
            {prefill.category
              ? `Métier déjà coché : ${prefill.category}. Gratuit, sans commission. Des professionnels vérifiés du Nord et du Pas-de-Calais vous recontactent — en général sous 24–48 h.`
              : prefill.unknownTrade
                ? "Vous cherchez un artisan sans métier précis : « Je ne sais pas / plusieurs métiers » est déjà sélectionné. Gratuit, sans commission — en général sous 24–48 h."
                : "Gratuit, sans commission. Des professionnels vérifiés du Nord et du Pas-de-Calais vous recontactent — en général sous 24–48 h."}
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
              googleEnabled={googleEnabled}
              googleReturnTo={googleReturnTo}
              googleError={googleError}
              defaults={
                loggedIn && client
                  ? {
                      firstName: client.firstName ?? session?.firstName ?? "",
                      lastName: client.lastName ?? session?.lastName ?? "",
                      email: client.email ?? session?.email ?? "",
                      phone: client.phone,
                      phoneVerifiedE164: client.phoneVerifiedE164,
                      phoneVerifiedAt: client.phoneVerifiedAt,
                      googleLinked: Boolean(client.googleSub),
                      googlePictureUrl: client.googlePictureUrl,
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
              href={`/particulier/espace/login?from=${encodeURIComponent(googleReturnTo)}`}
              className="font-medium text-brand-700 underline"
            >
              Se connecter
            </Link>
            {googleEnabled ? " ou utilisez Google en haut du formulaire." : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
