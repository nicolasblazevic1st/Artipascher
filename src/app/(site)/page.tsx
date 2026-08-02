import Link from "next/link";
import AuctionCard from "@/components/AuctionCard";
import StepCard from "@/components/StepCard";
import {
  CATEGORY_LABELS,
  FAQ_ITEMS,
  SAMPLE_AUCTIONS,
  type TradeCategory,
} from "@/lib/data";

const STEPS = [
  {
    title: "Demandez vos travaux",
    description:
      "Créez une demande avec votre budget, votre ville (59 ou 62) et vos besoins. Notre équipe valide votre projet.",
  },
  {
    title: "Enchère inversée",
    description:
      "Une enchère est créée. Les artisans du Nord proposent des prix de plus en plus bas, par paliers de 100 €.",
  },
  {
    title: "Le meilleur prix gagne",
    description:
      "À la fin de l'enchère, l'artisan avec l'offre la plus basse est automatiquement sélectionné.",
  },
];

export default function HomePage() {
  const categories = Object.entries(CATEGORY_LABELS) as [TradeCategory, string][];
  const activeCategories = new Set(SAMPLE_AUCTIONS.map((a) => a.category));

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur">
            Spécialiste Hauts-de-France · Nord 59 · Pas-de-Calais 62
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Enchères inversées pour vos travaux dans le Nord
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-blue-100">
            Artipascher connecte particuliers et artisans locaux inscrits au
            registre du commerce. Vous fixez votre budget, les professionnels
            vérifiés font baisser le prix.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/particulier"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 transition hover:bg-blue-50"
            >
              Demander des travaux
            </Link>
            <Link
              href="/professionnel"
              className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Devenir professionnel
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
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                Enchères actives dans le Nord
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
            {SAMPLE_AUCTIONS.slice(0, 6).map((auction) => (
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
          Tous corps de métier du bâtiment, artisans du Nord
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {categories.map(([key, label]) => (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-4 text-center"
            >
              <p className="font-medium text-slate-900">{label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {activeCategories.has(key)
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

      <section className="bg-brand-700 py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Prêt à lancer votre projet ?</h2>
          <p className="mt-4 text-blue-100">
            Gratuit pour les particuliers. Artisans vérifiés du Nord et
            Pas-de-Calais.
          </p>
          <Link
            href="/particulier"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-brand-700 transition hover:bg-blue-50"
          >
            Demander des travaux maintenant
          </Link>
        </div>
      </section>
    </>
  );
}
