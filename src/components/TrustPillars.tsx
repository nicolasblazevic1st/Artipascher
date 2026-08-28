export const TRUST_PILLARS = [
  {
    id: "decennale",
    label: "Garantie décennale",
    detail: "Travaux couverts 10 ans — En cas de malfaçon, vous êtes protégé.",
  },
  {
    id: "rc",
    label: "Assurance pro",
    detail:
      "Chantier assuré — Réduction significative du risque financier en cas d'incident sur les travaux.",
  },
  {
    id: "google",
    label: "Avis Google",
    detail: "Note vérifiée — Filtrez les artisans selon leur réputation réelle.",
  },
  {
    id: "bodacc",
    label: "Procédure collective",
    detail:
      "Entreprise saine — Vérifiée financièrement, réduction significative du risque d'abandon de chantier.",
  },
  {
    id: "rge",
    label: "Label RGE",
    detail:
      "Mention ADEME — Filtrez les artisans RGE pour les aides MaPrimeRénov’ et CEE.",
  },
] as const;

interface Props {
  className?: string;
}

/** Bande « Ce qu'on vérifie » — contrôles plateforme, sans cartes lourdes. */
export default function TrustPillars({ className = "" }: Props) {
  return (
    <section
      id="controles"
      className={`border-b border-slate-200 bg-stone-50 ${className}`}
      aria-labelledby="trust-pillars-title"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div>
          <h2
            id="trust-pillars-title"
            className="text-3xl font-bold text-slate-900"
          >
            Ce qu&apos;on vérifie chez chaque artisan
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            100&nbsp;% Nord-Pas-de-Calais (59 / 62) · jusqu&apos;à 3 artisans
            par annonce
          </p>
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
