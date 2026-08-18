import type { Metadata } from "next";
import Link from "next/link";
import TestBanner from "@/components/TestBanner";
import { shouldShowDemoBannerForProSession } from "@/lib/demo-banners";
import { getProSession } from "@/lib/pro-auth";
import { getEnrichedAuctions } from "@/lib/pro-dashboard";
import {
  isContactSlotsBannerEnabled,
  remainingAcceptSlots,
  MAX_CONTACT_UNLOCKS_PER_REQUEST,
} from "@/lib/contact-slots";
import { CATEGORY_LABELS, formatLocation } from "@/lib/data";
import { hasContactUnlock } from "@/lib/store";

export const metadata: Metadata = {
  title: "Offres",
};

export default async function ProChantiersPage() {
  const session = await getProSession();
  if (!session) return null;

  const auctions = await getEnrichedAuctions(session.proId);
  const showDemoBanner = shouldShowDemoBannerForProSession(session);
  const showContactSlots = isContactSlotsBannerEnabled();
  const unlockFlags = await Promise.all(
    auctions.map((a) => hasContactUnlock(session.proId, a.id))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Offres de particuliers</h1>
      <p className="mt-1 text-sm text-slate-600">
        {auctions.length} projet{auctions.length > 1 ? "s" : ""} disponible
        {auctions.length > 1 ? "s" : ""} en 59/62 · mise en contact 15 à
        25&nbsp;€ selon le ticket
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Projet</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Lieu</th>
              {showContactSlots && (
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  Places contact
                </th>
              )}
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auctions.map((auction, index) => {
              const unlocked = unlockFlags[index];
              const max =
                auction.maxAcceptedArtisans ?? MAX_CONTACT_UNLOCKS_PER_REQUEST;
              const left = remainingAcceptSlots(
                auction.acceptedArtisansCount ?? 0,
                max
              );
              return (
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
                    {showContactSlots && (
                      <p
                        className={`mt-1 text-xs font-semibold lg:hidden ${
                          left === 0
                            ? "text-slate-500"
                            : left <= 1
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }`}
                      >
                        {left === 0
                          ? "Plus de place contact"
                          : `${left} place${left > 1 ? "s" : ""} contact`}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-4 text-slate-600 sm:table-cell">
                    {formatLocation(auction.city, auction.department)}
                  </td>
                  {showContactSlots && (
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          left === 0
                            ? "bg-slate-100 text-slate-600"
                            : left <= 1
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {left === 0 ? "Complet" : `${left} / ${max} libres`}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    {unlocked ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Contact débloqué
                      </span>
                    ) : left === 0 ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Complet
                      </span>
                    ) : (
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        Disponible
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/pro/encheres/${auction.id}`}
                      className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      {unlocked ? "Voir contact" : "Débloquer"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
