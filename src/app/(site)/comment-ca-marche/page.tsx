import type { Metadata } from "next";
import Link from "next/link";
import SiteExplainer from "@/components/SiteExplainer";
import { DATA_HOSTING_NOTICE } from "@/lib/data";

export const metadata: Metadata = {
  title: "Comment ça marche — Présentation",
  description:
    "Découvrez Artipascher en 90 secondes : enchères inversées, devis après visite, artisans vérifiés Nord 59/62.",
};

export default function CommentCaMarchePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <p className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Présentation · ~90 secondes
        </p>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
          Comment fonctionne Artipascher ?
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Cette présentation utilise les mêmes couleurs et composants que le site
          (teal, ambre, violet). Vous pouvez l&apos;intégrer sur votre site ou
          l&apos;enregistrer à l&apos;écran pour en faire une vidéo.
        </p>
      </div>

      <div className="mt-10">
        <SiteExplainer />
      </div>

      <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center sm:p-6">
        <p className="text-sm font-semibold text-brand-900">Protection de vos données</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{DATA_HOSTING_NOTICE}</p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <Link
          href="/particulier"
          className="rounded-2xl border border-client-200 bg-client-50 p-6 transition hover:border-client-300"
        >
          <p className="font-semibold text-client-800">Je suis particulier</p>
          <p className="mt-1 text-sm text-slate-600">Déposer une demande de travaux</p>
        </Link>
        <Link
          href="/professionnel"
          className="rounded-2xl border border-brand-200 bg-brand-50 p-6 transition hover:border-brand-300"
        >
          <p className="font-semibold text-brand-800">Je suis artisan</p>
          <p className="mt-1 text-sm text-slate-600">Rejoindre les enchères 59/62</p>
        </Link>
      </div>

      <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
        <strong className="text-slate-700">Astuce vidéo :</strong> lancez la présentation,
        passez en plein écran (F11), enregistrez l&apos;écran avec l&apos;audio de votre
        script — vous obtiendrez une vidéo aux couleurs exactes du site.
      </p>
    </div>
  );
}
