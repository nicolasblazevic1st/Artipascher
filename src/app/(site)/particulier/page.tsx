import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import { FeatureCard } from "@/components/StepCard";
import StepCard from "@/components/StepCard";
import { getIsBetaMode } from "@/lib/beta-server";
import { WORK_REQUEST_FORM_PATH } from "@/lib/work-request-form-path";

export const metadata: Metadata = {
  title: "Particulier — Publiez votre demande de travaux",
  description:
    "Décrivez vos travaux dans le Nord-Pas-de-Calais. Les artisans vérifiés vous contactent. Compte optionnel pour suivre vos demandes.",
};

const DEMANDE_HREF = WORK_REQUEST_FORM_PATH;
const SIGNUP_HREF =
  "/particulier/espace/inscription?from=/particulier/espace/demandes";
const LOGIN_HREF =
  "/particulier/espace/login?from=/particulier/espace/demandes";

const FEATURES = [
  {
    title: "Gratuit pour vous",
    description:
      "Aucun frais, aucune commission sur vos travaux. Les professionnels utilisent leur solde pour obtenir vos coordonnées.",
  },
  {
    title: "Artisans RCS vérifiés",
    description:
      "Seules les entreprises inscrites au registre du commerce (SIRET vérifié) peuvent vous contacter, avec documents professionnels contrôlés. Artisans du 59 et 62.",
  },
  {
    title: "Gain de temps",
    description:
      "Une seule demande : les artisans correspondants vous contactent directement. Vous comparez leurs propositions.",
  },
  {
    title: "Compte optionnel",
    description:
      "Publiez sans créer de compte. Un espace particulier vous permet ensuite de retrouver et suivre vos demandes.",
  },
  {
    title: "Sécurité",
    description:
      "Vos données sont protégées et hébergées chez OVH, dans un datacenter du Nord de la France. Les artisans n’accèdent à vos coordonnées qu’après déblocage.",
  },
  {
    title: "Mise en contact claire",
    description:
      "En publiant, vous autorisez les artisans retenus à vous joindre. C’est à eux de prendre rendez-vous pour un devis sur place.",
  },
];

const STEPS = [
  {
    title: "Publiez votre demande",
    description:
      "Décrivez votre projet (ville 59/62, photos, détails). Aucun compte obligatoire.",
  },
  {
    title: "Les artisans vous contactent",
    description:
      "Les professionnels correspondant à votre besoin débloquent vos coordonnées et vous joignent.",
  },
  {
    title: "Suivez vos demandes (recommandé)",
    description:
      "Créez un compte gratuit pour retrouver vos demandes. Vous pouvez aussi filtrer les artisans (ancienneté, note Google).",
  },
];

export default async function ParticulierPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const gclid = typeof params.gclid === "string" ? params.gclid : "";
  const utmMedium =
    typeof params.utm_medium === "string" ? params.utm_medium : "";
  if (gclid || utmMedium.toLowerCase() === "cpc") {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value) qs.set(key, value);
    }
    redirect(
      qs.size > 0
        ? `${WORK_REQUEST_FORM_PATH}?${qs.toString()}`
        : WORK_REQUEST_FORM_PATH
    );
  }

  const beta = await getIsBetaMode();
  return (
    <>
      <section className="bg-gradient-to-br from-brand-800 to-brand-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold">Réalisez vos travaux en toute simplicité</h1>
          <p className="mt-4 text-lg text-brand-100">
            Publiez votre demande dans le Nord-Pas-de-Calais. Nord Artisan Pro ne prend
            rien : aucun frais, aucune commission sur vos travaux. Les
            professionnels vous contactent après avoir débloqué vos coordonnées.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={beta ? "#demande" : DEMANDE_HREF}
              className="inline-block rounded-xl bg-accent-500 px-8 py-3 font-semibold text-white hover:bg-accent-600"
            >
              Remplir le formulaire
            </Link>
            <Link
              href={LOGIN_HREF}
              className="inline-block rounded-xl border border-white/40 px-8 py-3 font-semibold text-white hover:bg-white/10"
            >
              Suivre mes demandes
            </Link>
          </div>
          <p className="mt-4 text-sm text-brand-100/90">
            Compte non obligatoire pour publier · recommandé pour le suivi
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Comment ça marche ?</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <StepCard key={step.title} number={i + 1} {...step} />
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Pourquoi Nord Artisan Pro ?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      <section id="demande" className="bg-slate-100 py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Remplir le formulaire</h2>
          <p className="mt-2 text-sm text-slate-600">
            Gratuit pour vous · Compte optionnel · Pros vérifiés · 59 / 62
          </p>
          {beta ? (
            <div className="mt-8 text-left">
              <BetaClosedNotice title="Demandes de travaux non ouvertes" />
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm text-slate-700">
                Remplissez le formulaire sans inscription. Créez un compte ensuite
                si vous voulez retrouver et suivre vos demandes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={DEMANDE_HREF}
                  className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600"
                >
                  Remplir le formulaire
                </Link>
                <Link
                  href={SIGNUP_HREF}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Créer un compte pour le suivi
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
