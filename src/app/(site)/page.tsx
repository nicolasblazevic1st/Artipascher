import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import BetaAwareLink from "@/components/BetaAwareLink";
import SiteExplainer from "@/components/SiteExplainer";
import StepCard from "@/components/StepCard";
import TrustPillars from "@/components/TrustPillars";
import { WorkCategoryIcon } from "@/components/WorkTradesIcons";
import { FAQ_ITEMS } from "@/lib/data";
import { listPublicAuctions } from "@/lib/work-request-auctions";
import { WORK_CATEGORIES } from "@/lib/work-categories";

const STEPS = [
  {
    title: "Publiez votre demande",
    description:
      "Décrivez votre projet (ville 59 ou 62, photos, détails). Aucun compte obligatoire. Notre équipe valide puis publie l’annonce.",
  },
  {
    title: "Jusqu’à 5 artisans vous contactent",
    description:
      "Des professionnels vérifiés de la région débloquent vos coordonnées et vous joignent pour un devis sur place.",
  },
  {
    title: "Comparez leurs propositions",
    description:
      "Les artisans vous contactent (visite, devis hors plateforme). Vous gardez la main — Nord Artisan Pro ne prend aucune commission.",
  },
];

export default async function HomePage() {
  const auctions = await listPublicAuctions();

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur">
            Nord Artisan Pro · 100&nbsp;% Nord-Pas-de-Calais · 59 / 62
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Jusqu&apos;à 5 artisans vérifiés pour vos travaux
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-brand-100">
            Gratuit pour vous — l&apos;artisan paie le contact. Vous êtes mis en
            relation avec des professionnels locaux contrôlés (décennale,
            assurance pro, avis Google, ancienneté, procédures collectives).
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <BetaAwareLink
              href="/travaux"
              className="rounded-xl bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              Remplir le formulaire
            </BetaAwareLink>
            <Link
              href="/professionnel"
              className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Je suis artisan
            </Link>
          </div>
        </div>
      </section>

      <TrustPillars />

      <section className="bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Catégories de travaux
          </h2>
          <p className="mt-2 text-center text-slate-600">
            Tous corps de métier du bâtiment, artisans du Nord-Pas-de-Calais
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {WORK_CATEGORIES.map((category) => (
              <BetaAwareLink
                key={category}
                href={`/travaux?category=${encodeURIComponent(category)}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-brand-300 hover:shadow-sm"
              >
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <WorkCategoryIcon category={category} className="h-5 w-5" />
                </span>
                <p className="mt-3 font-medium text-slate-900">{category}</p>
                <p className="mt-1 text-xs text-slate-500">Déposer une demande →</p>
              </BetaAwareLink>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Comment ça marche ?</h2>
          <p className="mt-2 text-slate-600">
            Une demande, jusqu&apos;à 5 artisans vérifiés, une mise en relation
            claire
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <StepCard key={step.title} number={index + 1} {...step} />
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Découvrez Nord Artisan Pro en action</h2>
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
                Offres de particuliers dans le Nord-Pas-de-Calais
              </h2>
              <p className="mt-2 text-slate-600">
                Dernières demandes publiées en 59 et 62
              </p>
            </div>
            <Link
              href="/offres"
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Voir toutes les offres →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {auctions.length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Aucune offre publiée pour le moment.
              </p>
            ) : (
              auctions.slice(0, 6).map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  showDemoBanner
                />
              ))
            )}
          </div>
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
            Gratuit pour vous — l&apos;artisan paie le contact. Jusqu&apos;à 5
            artisans vérifiés du Nord-Pas-de-Calais.
          </p>
          <BetaAwareLink
            href="/travaux"
            className="mt-8 inline-block rounded-xl bg-accent-500 px-8 py-3 font-semibold text-white transition hover:bg-accent-600"
          >
            Demander des travaux maintenant
          </BetaAwareLink>
        </div>
      </section>
    </>
  );
}
