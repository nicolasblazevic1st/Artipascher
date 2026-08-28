import type { Metadata } from "next";
import Link from "next/link";
import BetaAwareLink from "@/components/BetaAwareLink";
import SiteExplainer from "@/components/SiteExplainer";
import TrustPillars from "@/components/TrustPillars";
import { DATA_HOSTING_NOTICE } from "@/lib/data";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

export const metadata: Metadata = {
  title: "Comment ça marche — Présentation",
  description:
    "Jusqu'à 3 artisans vérifiés du Nord 59/62 : décennale, RC pro, avis Google, BODACC. Publiez votre demande, ils vous contactent.",
};

export default function CommentCaMarchePage() {
  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Présentation · ~90 secondes
          </p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            Nos artisans vérifiés pour vos travaux
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Gratuit pour vous — l&apos;artisan paie le contact. Vous publiez une
            demande dans le Nord-Pas-de-Calais ; jusqu&apos;à 3 artisans
            locaux contrôlés débloquent vos coordonnées et vous joignent.
          </p>
          <BetaAwareLink
            href={`${WORK_REQUEST_FORM_PATH}#formulaire`}
            className="mt-6 inline-flex rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
          >
            Remplir le formulaire
          </BetaAwareLink>
          <p className="mt-3 text-sm text-slate-500">
            Même si vous ne savez pas le métier — un seul formulaire.
          </p>
        </div>
      </div>

      <TrustPillars />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mt-2">
          <SiteExplainer />
        </div>

        <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center sm:p-6">
          <p className="text-sm font-semibold text-brand-900">
            Protection de vos données
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {DATA_HOSTING_NOTICE}
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <Link
            href={`${WORK_REQUEST_FORM_PATH}#formulaire`}
            className="rounded-2xl border border-client-200 bg-client-50 p-6 transition hover:border-client-300"
          >
            <p className="font-semibold text-client-800">Je suis particulier</p>
            <p className="mt-1 text-sm text-slate-600">
              Formulaire de travaux — métier optionnel
            </p>
          </Link>
          <Link
            href="/professionnel"
            className="rounded-2xl border border-brand-200 bg-brand-50 p-6 transition hover:border-brand-300"
          >
            <p className="font-semibold text-brand-800">Je suis artisan</p>
            <p className="mt-1 text-sm text-slate-600">Voir les offres 59/62</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
