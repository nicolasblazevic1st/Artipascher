import type { Metadata } from "next";
import Link from "next/link";
import ProRegistrationForm from "@/components/ProRegistrationForm";
import { FeatureCard } from "@/components/StepCard";
import StepCard from "@/components/StepCard";

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

const STEPS = [
  {
    title: "Inscription et validation RCS",
    description:
      "Vérification obligatoire de votre SIRET au registre du commerce. KBIS et assurance complémentaires. Validation sous 24-48 h.",
  },
  {
    title: "Consultez et enchérissez",
    description:
      "Parcourez les enchères actives 59/62. Proposez un prix inférieur par paliers de 100 €.",
  },
  {
    title: "Soyez retenu par le client",
    description:
      "Le particulier compare les offres et choisit l'artisan qui lui convient. Devis conforme à votre enchère.",
  },
];

const RULES = [
  "Entreprise inscrite au registre du commerce (SIRET vérifié) — obligatoire",
  "Siège ou établissement actif en Nord (59) ou Pas-de-Calais (62)",
  "Prix strictement inférieur au prix actuel",
  "Palier de 100 € entre chaque enchère",
  "Enchères multiples autorisées sur un même projet",
  "Enchère non modifiable une fois validée",
  "Commission plateforme : 10 % après achèvement de la prestation",
  "1 € par enchère placée (paiement obligatoire avant validation de l'offre)",
  "Coordonnées client masquées — déblocage 1 € par enchère (pro approuvé uniquement)",
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
        <h2 className="text-2xl font-bold">Règles des enchères</h2>
        <ul className="mt-6 space-y-3">
          {RULES.map((rule) => (
            <li
              key={rule}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm"
            >
              <span className="mt-0.5 text-brand-600">✓</span>
              {rule}
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
