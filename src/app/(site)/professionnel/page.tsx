import type { Metadata } from "next";
import Link from "next/link";
import ProRegistrationForm from "@/components/ProRegistrationForm";
import { FeatureCard } from "@/components/StepCard";
import StepCard from "@/components/StepCard";
import { BID_FEE_EUR, MAX_BIDS_PER_AUCTION } from "@/lib/auctions";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";

export const metadata: Metadata = {
  title: "Professionnel — Développez votre activité",
  description:
    "Rejoignez Artipascher, enchères inversées travaux Nord. Clients qualifiés 59/62, enchérissez sur les chantiers locaux.",
};

const FEATURES = [
  {
    title: "Clients qualifiés",
    description: "Budget défini, demande validée. Prospects sérieux du Nord et Pas-de-Calais.",
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
    title: "Concurrence équitable",
    description:
      "Proposez votre meilleur prix. Le client compare les offres et choisit librement l'artisan retenu.",
  },
  {
    title: "Transparence",
    description: "Prix actuel, historique et temps restant visibles en temps réel.",
  },
  {
    title: "Notifications",
    description: "Alertes pour nouvelles enchères et surenchères sur vos projets.",
  },
];

const PRICING = [
  {
    title: `Consulter le chantier · ${UNLOCK_PRICE_EUR} €`,
    description:
      "Débloquez les coordonnées du particulier pour visiter le chantier et établir votre devis gratuit sur place.",
  },
  {
    title: `Enchérir · ${BID_FEE_EUR} € par enchère`,
    description: `Placez une offre sur un projet. Maximum ${MAX_BIDS_PER_AUCTION} enchères par chantier. Paiement avant validation de l'offre.`,
  },
];

const STEPS = [
  {
    title: "Inscription et validation RCS",
    description:
      "Vérification obligatoire de votre SIRET au registre du commerce. KBIS et assurance complémentaires. Validation sous 24-48 h.",
  },
  {
    title: "Consultez et enchérissez",
    description:
      "Parcourez les enchères actives 59/62. Proposez le prix que vous souhaitez, inférieur au prix actuel.",
  },
  {
    title: "Soyez retenu par le client",
    description:
      "Le particulier compare les offres et choisit l'artisan qui lui convient. Devis conforme à votre enchère.",
  },
];

export default function ProfessionnelPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold">
            Développez votre activité dans le Nord
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Rejoignez Artipascher : clients qualifiés en 59 et 62, enchères
            inversées. Accès réservé aux entreprises inscrites au registre du
            commerce.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="#inscription"
              className="rounded-xl bg-accent-500 px-8 py-3 font-semibold text-white hover:bg-accent-600"
            >
              S&apos;inscrire
            </Link>
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
              Voir les enchères
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Pourquoi rejoindre Artipascher ?</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
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

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold">Tarifs plateforme</h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Seules facturations Artipascher — aucune commission sur vos prestations, pas
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
            <ProRegistrationForm />
          </div>
        </div>
      </section>
    </>
  );
}
