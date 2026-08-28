import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClientContactPublicCta from "@/components/ClientContactPublicCta";
import OfferJsonLd from "@/components/OfferJsonLd";
import ContactSlotsBanner from "@/components/ContactSlotsBanner";
import CoproprieteBanner from "@/components/CoproprieteBanner";
import OfferClientRequirements from "@/components/OfferClientRequirements";
import ProjectPhotos from "@/components/ProjectPhotos";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import PublishedDate from "@/components/PublishedDate";
import TestBanner from "@/components/TestBanner";
import { formatPublicLocation } from "@/lib/client-address";
import { resolveMaxContactArtisans } from "@/lib/contact-slots";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import {
  CATEGORY_LABELS,
  SAMPLE_AUCTIONS,
  formatLocation,
} from "@/lib/data";
import { BRAND } from "@/lib/brand";
import { PUBLIC_OFFERS_PATH, publishedAtForRequest } from "@/lib/public-offers";
import { countContactUnlocksForAuction } from "@/lib/store";
import {
  getWorkRequestByAuctionId,
  isPubliclyListedDemo,
  resolveAuction,
} from "@/lib/work-request-auctions";
import { resolveUnlockPricing } from "@/lib/pricing-tiers";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveAuction(id);
  if (!resolved) return { title: "Offre introuvable" };
  const isDemo = resolved.isTest === true;
  if (isDemo && !(await isPubliclyListedDemo(id))) {
    return { title: "Offre introuvable" };
  }
  return {
    title: `${resolved.title} — ${resolved.city}`,
    alternates: { canonical: `/offres/${id}` },
    ...(isDemo ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function OffreDetailPage({ params }: Props) {
  const { id } = await params;
  const resolved = await resolveAuction(id);

  if (!resolved) notFound();

  const workRequest = await getWorkRequestByAuctionId(id);
  const unlockCount = await countContactUnlocksForAuction(id);
  const sample = SAMPLE_AUCTIONS.find((a) => a.id === id);
  const workCategory =
    workRequest?.category ??
    (sample ? CATEGORY_LABELS[sample.category] : resolved.title);
  const unlockPricing = resolveUnlockPricing({
    pricingTier: workRequest?.pricingTier,
    workOptionId: workRequest?.workOptionId,
  });

  const isTest = resolved.isTest === true || workRequest?.isTest === true;
  if (isTest && !(await isPubliclyListedDemo(id))) notFound();

  const publishedAt =
    resolved.publishedAt ??
    (workRequest ? publishedAtForRequest(workRequest) : undefined);

  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl).replace(
    /\/$/,
    ""
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      {!isTest && (
        <OfferJsonLd
          name={resolved.title}
          url={`${origin}/offres/${id}`}
          category={workCategory}
          city={resolved.city}
          department={resolved.department}
          unlockPriceEur={unlockPricing.unlockPriceEur}
          slotsTaken={unlockCount}
          slotsMax={resolveMaxContactArtisans(workRequest)}
          status={resolved.status}
          publishedAt={publishedAt}
        />
      )}
      <Link href={PUBLIC_OFFERS_PATH} className="text-sm font-medium text-brand-700">
        ← Retour aux offres
      </Link>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isTest && <TestBanner variant="bar" />}
        <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {workCategory}
              </span>
              {(resolved.isCopropriete ||
                workRequest?.clientKind === "copropriete") && (
                <CoproprieteBanner
                  workScope={workRequest?.workScope ?? resolved.workScope}
                />
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {resolved.title}
            </h1>
            <p className="mt-1 text-slate-500">
              {workRequest
                ? formatPublicLocation(workRequest)
                : formatLocation(resolved.city, resolved.department)}
            </p>
            <PublishedDate publishedAt={publishedAt} className="mt-2" />
          </div>
          <span className="rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            {resolved.status === "active" ? "Ouvert aux contacts" : "Clôturé"}
          </span>
        </div>

        <p className="mt-6 leading-relaxed text-slate-600">{resolved.description}</p>

        <ProjectPhotos
          photos={workRequest?.photos ?? []}
          showPublicNote
        />

        <ContactSlotsBanner
          accepted={unlockCount}
          max={resolveMaxContactArtisans(workRequest)}
          className="mt-5"
        />

        {workRequest && (
          <OfferClientRequirements request={workRequest} className="mt-5" />
        )}

        {workRequest?.previousQuoteAmount != null && workRequest.previousQuoteProofUrl && (
          <div className="mt-6">
            <PreviousQuotePanel
              amount={workRequest.previousQuoteAmount}
              proofUrl={workRequest.previousQuoteProofUrl}
              note={workRequest.previousQuoteNote}
            />
          </div>
        )}

        {workRequest?.requestedWorkStartDate && (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <dt className="text-xs text-amber-700">Début travaux souhaité</dt>
              <dd className="mt-1 text-sm font-semibold text-amber-900">
                {formatRequestedWorkStartDate(workRequest.requestedWorkStartDate)}
              </dd>
            </div>
          </dl>
        )}

        {isTest ? (
          <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Annonce de démonstration — les coordonnées ne sont pas déblocables.
          </p>
        ) : (
          <ClientContactPublicCta
            auctionId={id}
            publicLocation={
              workRequest
                ? formatPublicLocation(workRequest)
                : formatLocation(resolved.city, resolved.department)
            }
            requestedWorkStartDate={workRequest?.requestedWorkStartDate}
            unlockPriceEur={unlockPricing.unlockPriceEur}
          />
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Jusqu’à 5 artisans correspondant aux attentes du client · Déblocage des
          coordonnées avec votre solde · Artisans RCS
        </p>
        </div>
      </div>
    </div>
  );
}
