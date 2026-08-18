import Link from "next/link";
import { BID_FEE_EUR } from "@/lib/auctions";
import { formatPrice } from "@/lib/data";

interface Props {
  auctionId: string;
  startPrice?: number;
  currentPrice?: number;
}

/**
 * Sur les pages publiques : renvoie le pro vers son espace pour enchérir.
 * Le formulaire d'enchère réel vit dans /pro/encheres/[id].
 */
export default function BidPanelPublicCta({
  auctionId,
  startPrice,
  currentPrice,
}: Props) {
  const pricingReady = startPrice != null && currentPrice != null;
  const href = `/pro/encheres/${encodeURIComponent(auctionId)}`;

  return (
    <section id="enchere" className="mt-8 rounded-xl border border-brand-200 bg-brand-50/50 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Placer une enchère</h2>
      {!pricingReady ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Le prix de départ sera fixé dès validation du premier devis par
          l&apos;administration.
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          Prix actuel :{" "}
          <strong className="text-brand-700">{formatPrice(currentPrice)}</strong>
          {" · "}{BID_FEE_EUR}&nbsp;€ (solde) par enchère · max. 3 offres par artisan
        </p>
      )}
      <p className="mt-3 text-sm text-slate-600">
        Les enchères se gèrent depuis votre espace professionnel (devis, PDF OCR, solde).
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={href}
          className="inline-flex rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Enchérir dans mon espace pro
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
