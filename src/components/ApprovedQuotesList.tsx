import { anonymousArtisanLabel } from "@/lib/anonymize-artisan";
import { formatPrice } from "@/lib/data";
import DecennaleVerifiedBadge from "@/components/DecennaleVerifiedBadge";
import QualificationBadge from "@/components/QualificationBadge";
import type { QualificationLevel } from "@/lib/qualification-tiers";

export interface DisplayQuote {
  id: string;
  companyName?: string;
  amount: number;
  description: string;
  visitDate: string;
  qualificationLevel?: QualificationLevel;
  decennaleVerifiedLabels?: string[];
}

interface Props {
  quotes: DisplayQuote[];
  title?: string;
  /** Si true, affiche les raisons sociales. Sinon anonymisé sur les pages publiques. */
  revealCompanyNames?: boolean;
}

export default function ApprovedQuotesList({
  quotes,
  title = "Devis après visite (validés)",
  revealCompanyNames = false,
}: Props) {
  if (quotes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Aucun devis validé pour le moment. Les artisans déposent leur devis après visite
        sur le chantier ; chaque devis est vérifié par Nord Artisan Pro avant publication.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {!revealCompanyNames && (
        <p className="text-xs text-slate-500">
          Les noms des artisans concurrents sont masqués sur cette page publique.
        </p>
      )}
      <ul className="space-y-4">
        {quotes.map((quote, index) => (
          <li
            key={quote.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    {revealCompanyNames && quote.companyName
                      ? quote.companyName
                      : anonymousArtisanLabel(index)}
                  </p>
                  {quote.qualificationLevel != null && (
                    <QualificationBadge level={quote.qualificationLevel} compact />
                  )}
                  {quote.decennaleVerifiedLabels && (
                    <DecennaleVerifiedBadge labels={quote.decennaleVerifiedLabels} compact />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Visite le{" "}
                  {new Date(quote.visitDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <p className="text-xl font-bold text-brand-700">{formatPrice(quote.amount)}</p>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {quote.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
