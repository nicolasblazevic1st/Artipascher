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
      "Les artisans se disputent votre projet. Le prix ne peut que baisser jusqu'au meilleur tarif du marché local. Aucune commission pour les particuliers.",
  },
  {
    title: "Artisans RCS vérifiés",
    description:
      "Seules les entreprises inscrites au registre du commerce (SIRET vérifié) peuvent enchérir, avec attestation décennale et assurance vérifiées. Artisans du 59 et 62 uniquement.",
  },
  {
    title: "Gain de temps",
    description:
      "Une seule demande, vous comparez les offres reçues et choisissez librement l'artisan qui vous convient.",
  },
  {
    title: "Transparence totale",
    description:
      "Suivez en temps réel les enchères, l'historique des prix et les participants.",
  },
  {
    title: "Sécurité",
    description:
      "Vos données sont protégées et hébergées chez OVH, dans un datacenter du Nord de la France. Les artisans ne voient que les infos nécessaires à leur proposition. C'est à eux de vous contacter et de prendre rendez-vous pour établir un devis gratuit sur place.",
  },
  {
    title: "100 % gratuit",
    description:
      "Publication gratuite, sans frais cachés. Vous ne payez que l'artisan retenu. Les artisans, eux, paient 1 € pour accéder à votre contact et aux coordonnées du chantier, et 1 € pour enchérir.",
  },
];

const STEPS = [
  {
    title: "Créez votre demande",
    description:
      "Formulaire simple : coordonnées, ville (Lille, Roubaix, Valenciennes…), description du projet et photos.",
  },
  {
    title: "Enchère inversée",
    description:
      "Le prix de départ est fixé au premier devis validé. Vous choisissez la durée (jusqu'à 3 mois). Les pros proposent ensuite des prix de plus en plus bas, sans palier imposé.",
  },
  {
    title: "Vous choisissez votre artisan",
    description:
      "À la fin de l'enchère, comparez les offres (prix, profil, qualifications) et sélectionnez l'artisan qui vous convient.",
  },
];

export default function ParticulierPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-800 to-brand-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold">Réalisez vos travaux au meilleur prix</h1>
          <p className="mt-4 text-lg text-brand-100">
            Enchères inversées dans les Hauts-de-France. Les professionnels
            disputent votre projet en proposant des prix toujours plus bas.
          </p>
          <Link
            href="#demande"
            className="mt-8 inline-block rounded-xl bg-accent-500 px-8 py-3 font-semibold text-white hover:bg-accent-600"
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
            <li>Artisan C : 3 800 €</li>
            <li>Artisan D : 4 100 €</li>
          </ul>
          <p className="mt-4 text-sm text-slate-700">
            Vous comparez les quatre offres et choisissez{" "}
            <strong>vous-même</strong> l&apos;artisan retenu — le moins cher n&apos;est pas imposé.
          </p>
          <p className="mt-2 text-sm text-brand-600 font-medium">
            Économie possible jusqu&apos;à 1 200 €, avec la liberté de choisir selon vos critères.
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
