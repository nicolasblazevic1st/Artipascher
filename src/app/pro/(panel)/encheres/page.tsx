import type { Metadata } from "next";
import Link from "next/link";
import TestBanner from "@/components/TestBanner";
import { shouldShowDemoBannerForProSession } from "@/lib/demo-banners";
import { getProSession } from "@/lib/pro-auth";
import { getEnrichedAuctions } from "@/lib/pro-dashboard";
import { formatAcceptedArtisanSlots } from "@/lib/contact-slots";
import { CATEGORY_LABELS, formatLocation, formatPrice } from "@/lib/data";
import { BID_FEE_EUR } from "@/lib/auctions";

export const metadata: Metadata = {
  title: "Enchères actives",
};

export default async function ProEncheresPage() {
  const session = await getProSession();
  if (!session) return null;

  const auctions = await getEnrichedAuctions(session.proId);
  const showDemoBanner = shouldShowDemoBannerForProSession(session);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Enchères actives</h1>
      <p className="mt-1 text-sm text-slate-600">
        {auctions.length} projet{auctions.length > 1 ? "s" : ""} disponible
        {auctions.length > 1 ? "s" : ""} en 59/62 · {BID_FEE_EUR} € par enchère
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Projet</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Lieu</th>
              <th className="px-4 py-3 font-medium">Prix actuel</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Offres</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">
                Acceptés
              </th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auctions.map((auction) => (
              <tr key={auction.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{auction.title}</p>
                    {auction.isTest && showDemoBanner && <TestBanner />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 sm:hidden">
                    {formatLocation(auction.city, auction.department)}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                    {CATEGORY_LABELS[auction.category]}
                  </span>
                </td>
                <td className="hidden px-4 py-4 text-slate-600 sm:table-cell">
                  {formatLocation(auction.city, auction.department)}
                </td>
                <td className="px-4 py-4">
                  <p className="font-bold text-brand-700">
                    {formatPrice(auction.liveCurrentPrice)}
                  </p>
                  <p className="text-xs text-slate-400">
                    départ {formatPrice(auction.startPrice)}
                  </p>
                </td>
                <td className="hidden px-4 py-4 text-slate-600 md:table-cell">
                  {auction.liveBidCount}
                </td>
                <td className="hidden px-4 py-4 tabular-nums text-slate-600 lg:table-cell">
                  {formatAcceptedArtisanSlots(
                    auction.acceptedArtisansCount ?? 0,
                    auction.maxAcceptedArtisans
                  )}
                </td>
                <td className="px-4 py-4">
                  {auction.isWinning ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Meilleur prix
                    </span>
                  ) : auction.myBestBid ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Surenchéri
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Non participé
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/pro/encheres/${auction.id}`}
                    className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    {auction.myBestBid ? "Repositionner" : "Enchérir"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
