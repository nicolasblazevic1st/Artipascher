import {
  anonymousArtisanLabel,
  formatAnonymousBidLabel,
} from "@/lib/anonymize-artisan";
import { formatPrice } from "@/lib/data";
import DecennaleVerifiedBadge from "@/components/DecennaleVerifiedBadge";
import QualificationBadge from "@/components/QualificationBadge";
import type { QualificationLevel } from "@/lib/qualification-tiers";

export interface BidDisplay {
  id: string;
  /** Nom réel — uniquement si `revealCompanyNames`. Sinon ignoré. */
  companyName?: string;
  amount: number;
  city?: string;
  department?: string;
  siretMasked?: string;
  qualificationLevel?: QualificationLevel;
  decennaleVerifiedLabels?: string[];
  /** Lien devis — réservé aux vues non publiques (admin / client). */
  devisProofUrl?: string;
  /** Index artisan anonymisé (0-based). */
  anonymousArtisanIndex?: number;
  /** Rang de l'offre pour cet artisan (1, 2 ou 3). */
  offerNumber?: number;
  anonymousLabel?: string;
}

interface Props {
  bids: BidDisplay[];
  /** Si true, affiche les raisons sociales (espace client / admin). Sinon anonymisé. */
  revealCompanyNames?: boolean;
}

function publicBidLabel(bid: BidDisplay, fallbackIndex: number): string {
  if (bid.anonymousLabel) return bid.anonymousLabel;
  if (bid.anonymousArtisanIndex != null && bid.offerNumber != null) {
    return formatAnonymousBidLabel(bid.anonymousArtisanIndex, bid.offerNumber);
  }
  return anonymousArtisanLabel(fallbackIndex);
}

export default function VerifiedBidsList({
  bids,
  revealCompanyNames = false,
}: Props) {
  if (bids.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Aucune offre pour le moment. Les pros paient 1 € pour chaque enchère.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {bids.length} offre{bids.length > 1 ? "s" : ""} — artisans RCS vérifiés
        {!revealCompanyNames && " · noms masqués · max. 3 offres / artisan"}
      </p>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {bids.map((bid, index) => (
          <li
            key={bid.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">
                  {revealCompanyNames && bid.companyName
                    ? `${bid.companyName}${
                        bid.offerNumber != null ? ` · offre ${bid.offerNumber}` : ""
                      }`
                    : publicBidLabel(bid, index)}
                </p>
                {bid.offerNumber != null && !revealCompanyNames && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {bid.offerNumber}/3
                  </span>
                )}
                {bid.qualificationLevel != null && (
                  <QualificationBadge level={bid.qualificationLevel} compact />
                )}
                {bid.decennaleVerifiedLabels && (
                  <DecennaleVerifiedBadge labels={bid.decennaleVerifiedLabels} compact />
                )}
              </div>
              {revealCompanyNames && bid.city && (
                <p className="text-xs text-slate-500">
                  {bid.city}
                  {bid.department ? ` (${bid.department})` : ""}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-lg font-bold text-brand-700">
                {formatPrice(bid.amount)}
              </span>
              {revealCompanyNames && bid.devisProofUrl && (
                <a
                  href={bid.devisProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-brand-700 underline"
                >
                  Devis OCR
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
