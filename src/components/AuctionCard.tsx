import Link from "next/link";
import ContactSlotsBanner from "@/components/ContactSlotsBanner";
import TestBanner from "@/components/TestBanner";
import {
  Auction,
  CATEGORY_LABELS,
  formatLocation,
  formatPrice,
} from "@/lib/data";
import { MAX_ACCEPTED_ARTISANS_PER_AUCTION } from "@/lib/contact-slots";

export default function AuctionCard({
  auction,
  showDemoBanner = true,
}: {
  auction: Auction;
  showDemoBanner?: boolean;
}) {
  const savings = auction.startPrice - auction.currentPrice;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md">
      {auction.coverPhotoUrl && (
        <img
          src={auction.coverPhotoUrl}
          alt=""
          className="h-40 w-full object-cover"
        />
      )}
      <ContactSlotsBanner
        accepted={auction.acceptedArtisansCount ?? 0}
        max={auction.maxAcceptedArtisans ?? MAX_ACCEPTED_ARTISANS_PER_AUCTION}
        compact
        className="rounded-none border-x-0 border-t-0"
      />
      <div className="flex flex-1 flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {CATEGORY_LABELS[auction.category]}
          </span>
          {auction.isTest && showDemoBanner && <TestBanner />}
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
          Active
        </span>
      </div>

      <h3 className="text-lg font-semibold text-slate-900">{auction.title}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {formatLocation(auction.city, auction.department)}
      </p>
      <p className="mt-3 line-clamp-2 flex-1 text-sm text-slate-600">
        {auction.description}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
        <div>
          <dt className="text-xs text-slate-500">Départ</dt>
          <dd className="text-sm font-semibold text-slate-700">
            {formatPrice(auction.startPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Actuel</dt>
          <dd className="text-sm font-bold text-brand-700">
            {formatPrice(auction.currentPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Offres</dt>
          <dd className="text-sm font-semibold text-slate-700">
            {auction.bidCount}
          </dd>
        </div>
      </dl>

      {savings > 0 && (
        <p className="mt-2 text-center text-xs font-medium text-brand-600">
          −{formatPrice(savings)} depuis le départ
        </p>
      )}

      <Link
        href={`/encheres/${auction.id}`}
        className="mt-4 rounded-lg bg-brand-600 py-2.5 text-center text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Voir l&apos;enchère
      </Link>
      </div>
    </article>
  );
}
