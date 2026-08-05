import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import SiteExplainer from "@/components/SiteExplainer";
import StepCard from "@/components/StepCard";
import { WorkCategoryIcon } from "@/components/WorkTradesIcons";
import { FAQ_ITEMS } from "@/lib/data";
import {
  getActiveWorkCategories,
  listPublicAuctions,
} from "@/lib/work-request-auctions";
import { WORK_CATEGORIES } from "@/lib/work-categories";

const STEPS = [
  {
    title: "Demandez vos travaux",
    description:
      "Créez une demande avec votre ville (59 ou 62), vos photos et une description détaillée. Notre équipe valide votre projet.",
  },
  {
    title: "Enchère inversée",
    description:
      "Une enchère est créée. Les artisans du Nord-Pas-de-Calais proposent des prix de plus en plus bas, librement.",
  },
  {
    title: "Choisissez votre artisan",
    description:
      "À la fin de l'enchère, comparez les offres reçues et sélectionnez librement l'artisan avec lequel vous souhaitez travailler.",
  },
];

export default async function HomePage() {
  const [activeCategories, auctions] = await Promise.all([
    getActiveWorkCategories(),
    listPublicAuctions(),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur">
            Spécialiste Nord-Pas-de-Calais · Nord 59 · Pas-de-Calais 62
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Enchères inversées pour vos travaux dans le Nord-Pas-de-Calais
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-100">
            Artipascher connecte particuliers et artisans locaux inscrits au
            registre du commerce. Le prix de départ est fixé au premier devis validé, les professionnels
            vérifiés font baisser le prix.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/particulier"
              className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              Demander des travaux
            </Link>
            <Link
              href="/professionnel"
              className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Je suis artisan
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Comment ça marche ?</h2>
          <p className="mt-2 text-slate-600">Un processus simple, inspiré du modèle enchères inversées</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <StepCard key={step.title} number={index + 1} {...step} />
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link
            href="/comment-ca-marche"
            className="text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            Voir la présentation animée (~90 s) →
          </Link>
        </p>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Découvrez Artipascher en action</h2>
            <p className="mt-2 text-slate-600">
              Présentation animée avec l&apos;interface réelle du site
            </p>
          </div>
          <SiteExplainer compact autoPlay />
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                Enchères actives dans le Nord-Pas-de-Calais
              </h2>
              <p className="mt-2 text-slate-600">
                Dernières opportunités disponibles en 59 et 62
              </p>
            </div>
            <Link
              href="/encheres"
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Voir toutes les enchères →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.slice(0, 6).map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Catégories de travaux
        </h2>
        <p className="mt-2 text-center text-slate-600">
          Tous corps de métier du bâtiment, artisans du Nord-Pas-de-Calais
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {WORK_CATEGORIES.map((category) => (
            <div
              key={category}
              className="rounded-xl border border-slate-200 bg-white p-4 text-center"
            >
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <WorkCategoryIcon category={category} className="h-5 w-5" />
              </span>
              <p className="mt-3 font-medium text-slate-900">{category}</p>
              <p className="mt-1 text-xs text-slate-500">
                {activeCategories.has(category)
                  ? "Enchères actives"
                  : "Aucune enchère"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Questions fréquentes
          </h2>
          <div className="mt-8 space-y-4">
            {FAQ_ITEMS.slice(0, 4).map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-slate-200 bg-white p-5"
              >
                <summary className="cursor-pointer font-semibold text-slate-900">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/faq" className="text-sm font-semibold text-brand-700">
              Voir toutes les questions →
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-brand-800 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Prêt à lancer votre projet ?</h2>
          <p className="mt-4 text-brand-100">
            Gratuit pour les particuliers. Artisans vérifiés du Nord-Pas-de-Calais.
          </p>
          <Link
            href="/particulier"
            className="mt-8 inline-block rounded-xl bg-accent-500 px-8 py-3 font-semibold text-white transition hover:bg-accent-600"
          >
            Demander des travaux maintenant
          </Link>
        </div>
      </section>
    </>
  );
}
