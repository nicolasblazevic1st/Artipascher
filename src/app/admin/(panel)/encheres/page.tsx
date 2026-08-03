import Link from "next/link";
import { computeCurrentPrice } from "@/lib/auctions";
import { CATEGORY_LABELS, SAMPLE_AUCTIONS, formatLocation, formatPrice } from "@/lib/data";
import { getBidsForAuction } from "@/lib/store";

export default async function AdminEncheresPage() {
  const auctionsWithBids = await Promise.all(
    SAMPLE_AUCTIONS.map(async (auction) => {
      const bids = await getBidsForAuction(auction.id);
      const currentPrice = computeCurrentPrice(
        auction.startPrice,
        bids.map((b) => b.amount)
      );
      const feesCollected = bids.reduce((sum, b) => sum + b.feeEur, 0);
      return { auction, bids, currentPrice, feesCollected };
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Enchères</h1>
      <p className="mt-1 text-sm text-slate-600">
        Suivi des enchères — 1 € par offre · artisans RCS vérifiés
      </p>

      <ul className="mt-8 space-y-4">
        {auctionsWithBids.map(({ auction, bids, currentPrice, feesCollected }) => (
          <li
            key={auction.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-brand-600">
                  {CATEGORY_LABELS[auction.category]}
                </span>
                <h2 className="mt-1 font-semibold text-slate-900">{auction.title}</h2>
                <p className="text-sm text-slate-500">
                  {formatLocation(auction.city, auction.department)}
                </p>
              </div>
              <div className="text-right text-sm">
                <p>
                  {formatPrice(auction.startPrice)} →{" "}
                  <strong className="text-brand-700">
                    {formatPrice(currentPrice ?? auction.startPrice)}
                  </strong>
                </p>
                <p className="text-slate-500">
                  {bids.length} offre{bids.length > 1 ? "s" : ""} · {feesCollected} € de frais
                </p>
              </div>
            </div>
            <Link
              href={`/encheres/${auction.id}`}
              className="mt-3 inline-block text-sm text-brand-600 hover:underline"
            >
              Voir sur le site public →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
