import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BidPanel from "@/components/BidPanel";
import ClientContactPanel from "@/components/ClientContactPanel";
import ProjectPhotos from "@/components/ProjectPhotos";
import TestBanner from "@/components/TestBanner";
import VerifiedBidsList from "@/components/VerifiedBidsList";
import { annotateAnonymousBids } from "@/lib/anonymize-artisan";
import { computeCurrentPrice } from "@/lib/auctions";
import { formatPublicLocation } from "@/lib/client-address";
import { formatLocation, formatPrice } from "@/lib/data";
import { shouldShowDemoBannerForProSession } from "@/lib/demo-banners";
import { getProSession } from "@/lib/pro-auth";
import {
  getBidsForAuction,
  mapBidsWithQualification,
} from "@/lib/store";
import {
  getWorkRequestByAuctionId,
  resolveAuction,
} from "@/lib/work-request-auctions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveAuction(id);
  if (!resolved) return { title: "Enchère introuvable" };
  return { title: `Enchérir — ${resolved.title}` };
}

export default async function ProEnchereDetailPage({ params }: Props) {
  const session = await getProSession();
  if (!session) return null;

  const { id } = await params;
  const resolved = await resolveAuction(id);
  if (!resolved) notFound();

  const workRequest = await getWorkRequestByAuctionId(id);
  const bids = await getBidsForAuction(id);
  const bidsWithLevel = await mapBidsWithQualification(
    bids,
    workRequest?.category
  );
  const anonymousBids = annotateAnonymousBids(bidsWithLevel);
  const currentPrice = computeCurrentPrice(
    resolved.startPrice,
    bids.map((b) => b.amount)
  );

  const showDemoBanner = shouldShowDemoBannerForProSession(session);

  return (
    <div>
      <Link href="/pro/encheres" className="text-sm font-medium text-brand-700">
        ← Retour aux enchères
      </Link>

      {resolved.isTest && showDemoBanner && <TestBanner className="mt-4" />}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{resolved.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {workRequest
              ? formatPublicLocation(workRequest)
              : formatLocation(resolved.city, resolved.department)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Prix actuel</p>
          <p className="text-xl font-bold text-brand-700">
            {currentPrice != null ? formatPrice(currentPrice) : "—"}
          </p>
          {resolved.startPrice != null && (
            <p className="text-xs text-slate-400">
              Départ {formatPrice(resolved.startPrice)}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        {resolved.description}
      </p>

      <ProjectPhotos photos={workRequest?.photos ?? []} showPublicNote />

      <ClientContactPanel
        auctionId={id}
        publicLocation={
          workRequest
            ? formatPublicLocation(workRequest)
            : formatLocation(resolved.city, resolved.department)
        }
        requestedWorkStartDate={workRequest?.requestedWorkStartDate}
      />

      <BidPanel
        auctionId={id}
        startPrice={resolved.startPrice}
        initialCurrentPrice={currentPrice}
        initialBids={anonymousBids.map((b) => ({
          id: b.id,
          label: b.anonymousLabel,
          offerNumber: b.offerNumber,
          amount: b.amount,
          createdAt: b.createdAt,
          qualificationLevel: b.qualificationLevel,
        }))}
        requiresQuote={workRequest !== null}
      />

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Offres indicatives (anonymisées)
        </h2>
        <div className="mt-4">
          <VerifiedBidsList
            bids={anonymousBids.map((b) => ({
              id: b.id,
              amount: b.amount,
              qualificationLevel: b.qualificationLevel,
              decennaleVerifiedLabels: b.decennaleVerifiedLabels,
              anonymousArtisanIndex: b.anonymousArtisanIndex,
              offerNumber: b.offerNumber,
              anonymousLabel: b.anonymousLabel,
            }))}
          />
        </div>
      </section>

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href={`/encheres/${id}`} className="text-brand-700 underline">
          Voir la page publique
        </Link>
      </p>
    </div>
  );
}
