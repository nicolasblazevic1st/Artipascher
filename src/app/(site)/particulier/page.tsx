import type { Metadata } from "next";
import Link from "next/link";
import WorkRequestForm from "@/components/WorkRequestForm";
import { FeatureCard } from "@/components/StepCard";
import StepCard from "@/components/StepCard";

export const metadata: Metadata = {
  title: "Particulier — Réalisez vos travaux au meilleur prix",
  description:
    "Demandez des travaux dans le Nord via enchères inversées. Budget fixé, artisans locaux font baisser le prix.",
};

const FEATURES = [
  {
    title: "Économies garanties",
    description:
      "Les artisans se disputent votre projet. Le prix ne peut que baisser jusqu'au meilleur tarif du marché local.",
  },
  {
    title: "Artisans RCS vérifiés",
    description:
      "Seules les entreprises inscrites au registre du commerce (SIRET vérifié) peuvent enchérir. Artisans du 59 et 62 uniquement.",
  },
  {
    title: "Gain de temps",
    description:
      "Une seule demande, la plateforme sélectionne automatiquement le meilleur prix. Fini les multiples devis.",
  },
  {
    title: "Transparence totale",
    description:
      "Suivez en temps réel les enchères, l'historique des prix et les participants.",
  },
  {
    title: "Sécurité",
    description:
      "Vos données sont protégées. Les artisans ne voient que les infos nécessaires à leur proposition.",
  },
  {
    title: "100 % gratuit",
    description:
      "Publication gratuite, sans frais cachés. Vous ne payez que l'artisan retenu.",
  },
];

const STEPS = [
  {
    title: "Créez votre demande",
    description:
      "Formulaire simple : coordonnées, ville (Lille, Roubaix, Valenciennes…), description du projet, budget et photos.",
  },
  {
    title: "Enchère inversée",
    description:
      "Votre budget devient le prix de départ. Les pros proposent des prix de plus en plus bas par paliers de 100 €.",
  },
  {
    title: "Sélection automatique",
    description:
      "À la fin, l'artisan au prix le plus bas est sélectionné et mis en relation avec vous.",
  },
];

export default function ParticulierPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-800 to-brand-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold">Réalisez vos travaux au meilleur prix</h1>
          <p className="mt-4 text-lg text-blue-100">
            Enchères inversées dans les Hauts-de-France. Les professionnels
            disputent votre projet en proposant des prix toujours plus bas.
          </p>
          <Link
            href="#demande"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-brand-700"
          >
            Demander des travaux
          </Link>
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
          <h2 className="text-center text-3xl font-bold">Pourquoi Artipascher ?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold">Exemple concret</h2>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-slate-600">
            Budget salle de bain à Lille : <strong>5 000 €</strong>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Prix de départ : 5 000 €</li>
            <li>Artisan A : 4 500 €</li>
            <li>Artisan B : 4 200 €</li>
            <li className="font-semibold text-brand-700">Artisan C : 3 800 € — Meilleur prix</li>
          </ul>
          <p className="mt-4 text-sm text-emerald-600 font-medium">
            Économie : 1 200 € sans comparer les devis vous-même.
          </p>
        </div>
      </section>

      <section id="demande" className="bg-slate-100 py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center">Demander des travaux</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Gratuit et sans engagement · Nord 59 / Pas-de-Calais 62
          </p>
          <WorkRequestForm />
        </div>
      </section>
    </>
  );
}
