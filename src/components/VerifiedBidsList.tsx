import { formatPrice } from "@/lib/data";
import DecennaleVerifiedBadge from "@/components/DecennaleVerifiedBadge";
import QualificationBadge from "@/components/QualificationBadge";
import type { QualificationLevel } from "@/lib/qualification-tiers";

export interface BidDisplay {
  id: string;
  companyName: string;
  amount: number;
  city?: string;
  department?: string;
  siretMasked?: string;
  qualificationLevel?: QualificationLevel;
  decennaleVerifiedLabels?: string[];
}

export default function VerifiedBidsList({ bids }: { bids: BidDisplay[] }) {
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
      </p>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {bids.map((bid) => (
          <li
            key={bid.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900">{bid.companyName}</p>
                {bid.qualificationLevel != null && (
                  <QualificationBadge level={bid.qualificationLevel} compact />
                )}
                {bid.decennaleVerifiedLabels && (
                  <DecennaleVerifiedBadge labels={bid.decennaleVerifiedLabels} compact />
                )}
              </div>
              {bid.city && (
                <p className="text-xs text-slate-500">
                  {bid.city}
                  {bid.department ? ` (${bid.department})` : ""}
                </p>
              )}
            </div>
            <span className="text-lg font-bold text-brand-700">
              {formatPrice(bid.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
