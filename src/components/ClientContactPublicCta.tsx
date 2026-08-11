import Link from "next/link";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import { UNLOCK_PRICE_EUR } from "@/lib/client-contacts";
import {
  formatUnlockPriceEur,
  unlockCreditsForPriceEur,
} from "@/lib/pricing-tiers";

interface Props {
  auctionId: string;
  publicLocation: string;
  requestedWorkStartDate?: string;
  unlockPriceEur?: number;
}

/**
 * Sur les pages publiques : renvoie le pro vers son espace pour
 * débloquer les coordonnées (matching + crédits).
 */
export default function ClientContactPublicCta({
  auctionId,
  publicLocation,
  requestedWorkStartDate,
  unlockPriceEur = UNLOCK_PRICE_EUR,
}: Props) {
  const href = `/pro/encheres/${encodeURIComponent(auctionId)}`;
  const unlockCredits = unlockCreditsForPriceEur(unlockPriceEur);
  const priceLabel = formatUnlockPriceEur(unlockPriceEur);

  return (
    <section id="contact" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Coordonnées client</h2>
      <p className="mt-2 text-sm text-slate-600">
        Les photos restent visibles librement. Depuis votre espace pro, débloquez
        les coordonnées si vous correspondez aux attentes du client (max. 5
        artisans) pour {priceLabel} ({unlockCredits} crédit
        {unlockCredits > 1 ? "s" : ""}).
      </p>

      <dl className="mt-4 rounded-lg bg-white p-4 text-sm">
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Localisation</dt>
          <dd className="font-medium">{publicLocation}</dd>
        </div>
        {requestedWorkStartDate && (
          <div className="flex justify-between border-b border-slate-100 py-2">
            <dt className="text-slate-500">Début travaux souhaité</dt>
            <dd className="font-medium text-amber-800">
              {formatRequestedWorkStartDate(requestedWorkStartDate)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Client</dt>
          <dd className="text-slate-400">Masqué</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 py-2">
          <dt className="text-slate-500">Téléphone</dt>
          <dd className="text-slate-400">06 •• •• •• ••</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-slate-500">Email</dt>
          <dd className="text-slate-400">•••@•••.fr</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Débloquer dans mon espace pro
        </Link>
        <Link
          href="/pro/login"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Connexion pro
        </Link>
      </div>
    </section>
  );
}
