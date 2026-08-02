import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BidPanel from "@/components/BidPanel";
import ClientContactPanel from "@/components/ClientContactPanel";
import VerifiedBidsList from "@/components/VerifiedBidsList";
import { computeCurrentPrice } from "@/lib/auctions";
import {
  CATEGORY_LABELS,
  SAMPLE_AUCTIONS,
  formatLocation,
  formatPrice,
} from "@/lib/data";
import { getBidsForAuction } from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const auction = SAMPLE_AUCTIONS.find((a) => a.id === id);
  if (!auction) return { title: "Enchère introuvable" };
  return {
    title: `${auction.title} — ${auction.city}`,
  };
}

export default async function EnchereDetailPage({ params }: Props) {
  const { id } = await params;
  const auction = SAMPLE_AUCTIONS.find((a) => a.id === id);

  if (!auction) notFound();

  const bids = await getBidsForAuction(id);
  const currentPrice = computeCurrentPrice(
    auction.startPrice,
    bids.map((b) => b.amount)
  );

  const savings = auction.startPrice - currentPrice;
  const endsAt = new Date(auction.endsAt).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const bidRows = bids.map((b) => ({
    id: b.id,
    companyName: b.companyName,
    amount: b.amount,
    createdAt: b.createdAt,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/encheres" className="text-sm font-medium text-brand-700">
        ← Retour aux enchères
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {CATEGORY_LABELS[auction.category]}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {auction.title}
            </h1>
            <p className="mt-1 text-slate-500">
              {formatLocation(auction.city, auction.department)}
            </p>
          </div>
          <span className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            Enchère active
          </span>
        </div>

        <p className="mt-6 leading-relaxed text-slate-600">{auction.description}</p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <dt className="text-xs text-slate-500">Prix de départ</dt>
            <dd className="mt-1 text-xl font-semibold">
              {formatPrice(auction.startPrice)}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-50 p-4 text-center">
            <dt className="text-xs text-brand-600">Prix actuel</dt>
            <dd className="mt-1 text-xl font-bold text-brand-700">
              {formatPrice(currentPrice)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <dt className="text-xs text-slate-500">Offres</dt>
            <dd className="mt-1 text-xl font-semibold">{bids.length}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <dt className="text-xs text-slate-500">Fin</dt>
            <dd className="mt-1 text-sm font-semibold">{endsAt}</dd>
          </div>
        </dl>

        {savings > 0 && (
          <p className="mt-4 text-center text-sm font-medium text-brand-600">
            Économie actuelle : {formatPrice(savings)} par rapport au budget initial
          </p>
        )}

        <BidPanel
          auctionId={auction.id}
          startPrice={auction.startPrice}
          initialCurrentPrice={currentPrice}
          initialBids={bidRows}
        />

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Offres des artisans (RCS vérifié)
          </h2>
          <div className="mt-4">
            <VerifiedBidsList
              bids={bids.map((b) => ({
                id: b.id,
                companyName: b.companyName,
                amount: b.amount,
              }))}
            />
          </div>
        </section>

        <ClientContactPanel
          auctionId={auction.id}
          city={auction.city}
          department={auction.department}
        />

        <p className="mt-8 text-center text-xs text-slate-500">
          1 € par enchère · Coordonnées client débloquables séparément · Artisans RCS
        </p>
      </div>
    </div>
  );
}
