import Link from "next/link";

export const TRUST_PILLARS = [
  {
    id: "decennale",
    label: "Garantie décennale",
    detail: "Attestation PDF contrôlée",
  },
  {
    id: "rc",
    label: "Assurance pro",
    detail: "Responsabilité civile à jour",
  },
  {
    id: "google",
    label: "Avis Google",
    detail: "Filtre possible selon note connue",
  },
  {
    id: "age",
    label: "Ancienneté d'entreprise",
    detail: "Moins de 2 ans ou plus de 2 ans selon votre choix",
  },
  {
    id: "bodacc",
    label: "Procédures collectives",
    detail: "Contrôle BODACC à l'inscription",
  },
] as const;

interface Props {
  /** Affiche le lien vers la présentation. */
  showLearnMore?: boolean;
  className?: string;
}

/** Bande « Ce qu'on vérifie » — 5 contrôles, sans cartes lourdes. */
export default function TrustPillars({
  showLearnMore = true,
  className = "",
}: Props) {
  return (
    <section
      id="controles"
      className={`border-b border-slate-200 bg-stone-50 ${className}`}
      aria-labelledby="trust-pillars-title"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="trust-pillars-title"
              className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
            >
              Ce qu&apos;on vérifie chez chaque artisan
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              100&nbsp;% Nord-Pas-de-Calais (59 / 62) · jusqu&apos;à 5 mises en
              contact par annonce
            </p>
          </div>
          {showLearnMore ? (
            <Link
              href="/comment-ca-marche#controles"
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Voir comment on vérifie →
            </Link>
          ) : null}
        </div>

        <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
          {TRUST_PILLARS.map((pillar) => (
            <li
              key={pillar.id}
              className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <span className="text-sm font-semibold text-slate-900">
                {pillar.label}
              </span>
              <span className="text-sm text-slate-600 sm:text-right">
                {pillar.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
