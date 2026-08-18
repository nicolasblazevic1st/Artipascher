import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClientContactPublicCta from "@/components/ClientContactPublicCta";
import ContactSlotsBanner from "@/components/ContactSlotsBanner";
import CoproprieteBanner from "@/components/CoproprieteBanner";
import ProjectPhotos from "@/components/ProjectPhotos";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import { resolveAuctionEndsAt } from "@/lib/auction-duration";
import { formatPublicLocation } from "@/lib/client-address";
import { resolveMaxContactArtisans } from "@/lib/contact-slots";
import {
  buildShareText,
  absoluteUrl,
  getPublicShareUrl,
  isAuctionStillActive,
} from "@/lib/share";
import { countContactUnlocksForAuction } from "@/lib/store";
import { getWorkRequestByShareToken } from "@/lib/work-request-auctions";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const request = await getWorkRequestByShareToken(token);
  if (!request) return { title: "Chantier introuvable" };

  const title = `${request.category} · ${request.city} (${request.department})`;
  const description = buildShareText(request);
  const url = getPublicShareUrl(token);
  const image = request.photos?.[0] ? absoluteUrl(request.photos[0]) : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "fr_FR",
      siteName: "Nord Artisan Pro",
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function SharedChantierPage({ params }: Props) {
  const { token } = await params;
  const request = await getWorkRequestByShareToken(token);
  if (!request?.auctionId) notFound();

  const unlockCount = await countContactUnlocksForAuction(request.auctionId);
  const auctionEndsAt = resolveAuctionEndsAt({
    auctionEndsAt: request.auctionEndsAt,
    auctionDurationHours: request.auctionDurationHours,
    auctionDurationDays: request.auctionDurationDays,
    from: request.reviewedAt ?? request.createdAt,
  });
  const active = isAuctionStillActive(auctionEndsAt);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/encheres" className="text-sm font-medium text-brand-700">
        ← Voir tous les chantiers
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                {request.category}
              </span>
              {request.clientKind === "copropriete" && (
                <CoproprieteBanner workScope={request.workScope} />
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Demande de travaux · {request.city}
            </h1>
            <p className="mt-1 text-slate-500">
              {formatPublicLocation(request)}
            </p>
          </div>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              active ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {active ? "Ouvert aux contacts" : "Clôturé"}
          </span>
        </div>

        <p className="mt-6 leading-relaxed text-slate-600">{request.description}</p>

        <ProjectPhotos photos={request.photos ?? []} showPublicNote />

        <ContactSlotsBanner
          accepted={unlockCount}
          max={resolveMaxContactArtisans(request)}
          className="mt-5"
        />

        {request.previousQuoteAmount != null && request.previousQuoteProofUrl && (
          <div className="mt-6">
            <PreviousQuotePanel
              amount={request.previousQuoteAmount}
              proofUrl={request.previousQuoteProofUrl}
              note={request.previousQuoteNote}
            />
          </div>
        )}

        {active && (
          <ClientContactPublicCta
            auctionId={request.auctionId}
            publicLocation={formatPublicLocation(request)}
            requestedWorkStartDate={request.requestedWorkStartDate}
          />
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Nord Artisan Pro · Mise en relation artisans · Nord 59 / Pas-de-Calais 62
        </p>
      </div>
    </div>
  );
}
