import type { Metadata } from "next";
import Link from "next/link";
import { getProSession } from "@/lib/pro-auth";
import { getEnrichedAuctions, groupBidsByAuction } from "@/lib/pro-dashboard";
import { CATEGORY_LABELS, formatLocation, formatPrice } from "@/lib/data";
import { getBidsForPro } from "@/lib/store";

export const metadata: Metadata = {
  title: "Mes offres",
};

export default async function ProMesEncheresPage() {
  const session = await getProSession();
  if (!session) return null;

  const [bids, auctions] = await Promise.all([
    getBidsForPro(session.proId),
    getEnrichedAuctions(session.proId),
  ]);

  const grouped = groupBidsByAuction(bids);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Mes offres</h1>
      <p className="mt-1 text-sm text-slate-600">
        {bids.length} enchère{bids.length > 1 ? "s" : ""} placée
        {bids.length > 1 ? "s" : ""} sur {grouped.length} projet
        {grouped.length > 1 ? "s" : ""}
      </p>

      {grouped.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-600">Vous n&apos;avez pas encore placé d&apos;offre.</p>
          <Link
            href="/pro/encheres"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Parcourir les enchères
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {grouped.map(({ auctionId, bids: auctionBids, bestAmount }) => {
            const auction = auctions.find((a) => a.id === auctionId);
            const isWinning = auction?.isWinning ?? false;

            return (
              <article
                key={auctionId}
                className={`rounded-xl border bg-white p-5 ${
                  isWinning ? "border-emerald-200" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {auction?.title ?? `Enchère #${auctionId}`}
                    </h2>
                    {auction && (
                      <p className="mt-1 text-sm text-slate-500">
                        {formatLocation(auction.city, auction.department)} ·{" "}
                        {CATEGORY_LABELS[auction.category]}
                      </p>
                    )}
                  </div>
                  {isWinning ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Meilleur prix actuel
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Surenchéri
                    </span>
                  )}
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-xs text-slate-500">Votre meilleure offre</dt>
                    <dd className="mt-1 text-lg font-bold text-brand-700">
                      {formatPrice(bestAmount)}
                    </dd>
                  </div>
                  {auction && (
                    <>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <dt className="text-xs text-slate-500">Prix actuel</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">
                          {formatPrice(auction.liveCurrentPrice)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <dt className="text-xs text-slate-500">Nombre d&apos;offres</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">
                          {auctionBids.length}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>

                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium text-slate-500">
                    Historique de vos offres ({auctionBids.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    {auctionBids
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .map((bid) => (
                        <li key={bid.id} className="flex justify-between py-1">
                          <span>
                            {new Date(bid.createdAt).toLocaleString("fr-FR")}
                          </span>
                          <span className="font-medium">{formatPrice(bid.amount)}</span>
                        </li>
                      ))}
                  </ul>
                </details>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/pro/encheres/${auctionId}`}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    {isWinning ? "Voir l'enchère" : "Repositionner"}
                  </Link>
                  {isWinning && (
                    <Link
                      href={`/pro/encheres/${auctionId}#contact`}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Débloquer les coordonnées client
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
