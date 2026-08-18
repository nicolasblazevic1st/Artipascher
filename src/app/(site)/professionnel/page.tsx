import type { Metadata } from "next";
import Link from "next/link";
import BetaAwareLink from "@/components/BetaAwareLink";
import BetaClosedNotice from "@/components/BetaClosedNotice";
import ProRegistrationForm from "@/components/ProRegistrationForm";
import { FeatureCard } from "@/components/StepCard";
import StepCard from "@/components/StepCard";
import { getIsBetaMode } from "@/lib/beta-server";

export const metadata: Metadata = {
  title: "Professionnel — Développez votre activité",
  description:
    "Rejoignez Nord Artisan Pro : mise en relation avec des clients qualifiés en 59/62. Débloquez les coordonnées au ticket du chantier.",
};

const FEATURES = [
  {
    title: "Clients qualifiés",
    description: "Demande validée, projet clair. Prospects sérieux du Nord-Pas-de-Calais.",
  },
  {
    title: "Marché local",
    description: "Chantiers Lille, Roubaix, Tourcoing, Valenciennes, Lens… dans votre zone.",
  },
  {
    title: "Gain de temps",
    description: "Fini la prospection. Les clients viennent avec des projets clairs.",
  },
  {
    title: "Matching métier",
    description:
      "Vous consultez toutes les offres ; le déblocage des coordonnées est réservé si votre profil correspond aux critères du client.",
  },
  {
    title: "Places limitées",
    description: "Maximum 5 artisans par chantier — moins de concurrence inutile.",
  },
  {
    title: "Notifications",
    description: "Alertes pour les nouveaux chantiers dans votre zone.",
  },
];

const PRICING = [
  {
    title: `Mise en contact · 15 à 25 € selon ticket`,
    description:
      "Accédez aux coordonnées du client pour le joindre, visiter le chantier et lui envoyer votre devis. Paiement unitaire au moment du déblocage (15 à 25 € selon le ticket).",
  },
];

const STEPS = [
  {
    title: "Inscription rapide",
    description:
      "Niveau 1 : SIRET contrôlé au registre du commerce, attestation décennale et RC pro obligatoires par métier.",
  },
  {
    title: "Débloquez les contacts",
    description:
      "Parcourez les chantiers qui vous correspondent et débloquez les coordonnées (15 à 25 € selon le ticket, max. 5 artisans).",
  },
  {
    title: "Concluez hors plateforme",
    description:
      "Appelez le client, visitez le chantier et envoyez votre devis — Nord Artisan Pro ne prend aucune commission sur vos travaux.",
  },
];

export default async function ProfessionnelPage() {
  const beta = await getIsBetaMode();
  return (
    <>
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold">
            Développez votre activité dans le Nord-Pas-de-Calais
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Rejoignez Nord Artisan Pro : clients qualifiés en 59 et 62, mise en
            relation ciblée. Accès réservé aux entreprises inscrites au registre
            du commerce.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <BetaAwareLink
              href="#inscription"
              className="rounded-xl bg-accent-500 px-8 py-3 font-semibold text-white hover:bg-accent-600"
            >
              S&apos;inscrire
            </BetaAwareLink>
            <Link
              href="/pro/login"
              className="rounded-xl border border-slate-500 px-8 py-3 font-semibold hover:bg-slate-800"
            >
              Se connecter
            </Link>
            <Link
              href="/encheres"
              className="rounded-xl border border-slate-600 px-8 py-3 font-semibold hover:bg-slate-800"
            >
              Voir les chantiers
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Comment ça marche ?</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <StepCard key={step.title} number={i + 1} {...step} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Pourquoi rejoindre Nord Artisan Pro ?</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold">Tarifs plateforme</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Seules facturations Nord Artisan Pro — aucune commission sur vos prestations, pas
          d&apos;abonnement.
        </p>
        <ul className="mt-8 space-y-4">
          {PRICING.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-brand-100 bg-brand-50/50 p-5"
            >
              <p className="font-semibold text-brand-900">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section id="inscription" className="bg-slate-100 py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-center">Inscription professionnelle</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Vérification RCS obligatoire · Nord 59 / Pas-de-Calais 62
          </p>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            {beta ? (
              <BetaClosedNotice title="Inscriptions professionnelles fermées" />
            ) : (
              <ProRegistrationForm />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
