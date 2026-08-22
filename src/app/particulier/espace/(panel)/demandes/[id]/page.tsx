import Link from "next/link";
import { notFound } from "next/navigation";
import ClientContactRequestsPanel from "@/components/client/ClientContactRequestsPanel";
import ClientDemandePhotosPanel from "@/components/client/ClientDemandePhotosPanel";
import ClientSubmitQuotePanel from "@/components/client/ClientSubmitQuotePanel";
import SelectArtisanPanel from "@/components/client/SelectArtisanPanel";
import ShareAuctionPanel from "@/components/client/ShareAuctionPanel";
import CoproprieteBanner from "@/components/CoproprieteBanner";
import PreviousQuotePanel from "@/components/PreviousQuotePanel";
import { formatPublicLocation, formatWorkRequestAddress } from "@/lib/client-address";
import { formatRequestedWorkStartDate } from "@/lib/demandes-validation";
import { formatPublishedDate, publishedAtForRequest } from "@/lib/public-offers";
import { getClientSession } from "@/lib/client-auth";
import { formatWorkPrestationLabel } from "@/lib/pricing-tiers";
import {
  ensureWorkRequestShareToken,
  getApprovedProQuotesForAuction,
  getBidsForAuction,
  getWorkRequestForClient,
  mapBidsWithQualification,
  mapQuotesWithQualification,
} from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABELS = {
  pending: "En validation par notre équipe",
  approved: "Annonce active",
  rejected: "Demande refusée",
};

export default async function ClientDemandeDetailPage({ params }: Props) {
  const session = await getClientSession();
  if (!session) return null;

  const { id } = await params;
  const request = await getWorkRequestForClient(id, session.clientId);
  if (!request) notFound();

  const bids = request.auctionId ? await getBidsForAuction(request.auctionId) : [];
  const quotes = request.auctionId
    ? await getApprovedProQuotesForAuction(request.auctionId)
    : [];
  const bidsWithLevel = await mapBidsWithQualification(bids, request.category);
  const quotesWithLevel = await mapQuotesWithQualification(quotes, request.category);
  const canSelect =
    request.status === "approved" && !request.selectedQuoteId && !request.selectedBidId;
  const shareToken =
    request.status === "approved"
      ? await ensureWorkRequestShareToken(id, session.clientId)
      : null;
  const photosEditable = request.status !== "rejected";
  const prestationLabel = formatWorkPrestationLabel(request);

  return (
    <div>
      <Link
        href="/particulier/espace/demandes"
        className="text-sm font-medium text-client-600"
      >
        ← Mes demandes
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {request.category} · {request.city}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatPublicLocation(request)} · {STATUS_LABELS[request.status]}
              {request.clientKind === "company" && request.companyName
                ? ` · ${request.companyName}`
                : ""}
            </p>
            {request.clientKind === "copropriete" && (
              <div className="mt-2">
                <CoproprieteBanner workScope={request.workScope} />
              </div>
            )}
            {request.nafCodes && request.nafCodes.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                Spécialité NAF : {request.nafCodes.join(" · ")}
              </p>
            )}
            {(request.workOptionId || request.workOptionOtherDescription) && (
              <p className="mt-1 text-xs text-slate-600">
                Prestation : {prestationLabel}
              </p>
            )}
          </div>
          {request.auctionId && request.status === "approved" && (
            <p className="text-xs text-slate-500">Annonce active</p>
          )}
        </div>

        {shareToken && (
          <div className="mt-6">
            <ShareAuctionPanel
              shareToken={shareToken}
              category={request.category}
              city={request.city}
              department={request.department}
              startPrice={request.startPrice}
            />
          </div>
        )}

        {request.status === "approved" && (
          <ClientContactRequestsPanel workRequestId={request.id} />
        )}

        <p className="mt-6 leading-relaxed text-slate-600">{request.description}</p>

        <p className="mt-4 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Adresse du chantier :</span>{" "}
          {formatWorkRequestAddress(request)}
        </p>

        {request.phone && (
          <p className="mt-2 text-sm text-slate-600">
            <span className="font-medium text-slate-800">Téléphone :</span>{" "}
            {request.phone}
            {request.phoneVerifiedAt && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Vérifié SMS
              </span>
            )}
          </p>
        )}

        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Début de travaux souhaité :</span>{" "}
          {formatRequestedWorkStartDate(request.requestedWorkStartDate)}
        </p>

        <ClientDemandePhotosPanel
          requestId={request.id}
          initialPhotos={request.photos ?? []}
          editable={photosEditable}
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

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Date de publication</dt>
            <dd className="mt-1 text-sm font-semibold">
              {request.status === "approved"
                ? formatPublishedDate(publishedAtForRequest(request)) ?? "—"
                : "Pas encore publiée"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Artisans maximum</dt>
            <dd className="mt-1 text-sm font-semibold">
              {typeof request.maxContactArtisans === "number"
                ? request.maxContactArtisans
                : 5}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Ancienneté souhaitée</dt>
            <dd className="mt-1 text-sm font-semibold">
              {request.preferEstablishedCompany === true
                ? "Uniquement 5+"
                : request.preferEstablishedCompany === false
                  ? "Uniquement 0 à 5 ans"
                  : "Peu importe"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Note Google minimale</dt>
            <dd className="mt-1 text-sm font-semibold">
              {request.minGoogleRating
                ? `≥ ${String(request.minGoogleRating).replace(".", ",")}/5`
                : "Peu importe"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Conditions obligatoires</dt>
            <dd className="mt-1 text-sm font-semibold">
              Statut normal · décennale &amp; RC pro à jour
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">Mise en contact</dt>
            <dd className="mt-1 text-sm font-semibold">
              Autorisée via CGU / CGV (max. 5 artisans)
            </dd>
          </div>
        </dl>

        {request.status === "approved" && request.auctionEndsAt && (
          <p className="mt-4 text-sm text-slate-600">
            Visible jusqu&apos;au{" "}
            <strong>
              {new Date(request.auctionEndsAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            Artisans &amp; propositions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Les devis se font directement avec les artisans qui vous contactent
            après déblocage. L&apos;historique ci-dessous peut encore afficher
            d&apos;anciennes propositions.
          </p>
          <div className="mt-4">
            <SelectArtisanPanel
              requestId={request.id}
              quotes={quotesWithLevel.map((q) => ({
                id: q.id,
                companyName: q.companyName,
                amount: q.amount,
                description: q.description,
                visitDate: q.visitDate,
                qualificationLevel: q.qualificationLevel,
                decennaleVerifiedLabels: q.decennaleVerifiedLabels,
              }))}
              bids={bidsWithLevel.map((b) => ({
                id: b.id,
                companyName: b.companyName,
                amount: b.amount,
                qualificationLevel: b.qualificationLevel,
                decennaleVerifiedLabels: b.decennaleVerifiedLabels,
              }))}
              selectedQuoteId={request.selectedQuoteId}
              selectedBidId={request.selectedBidId}
              canSelect={canSelect}
            />
          </div>
        </section>

        {request.status === "approved" && request.auctionId && (
          <ClientSubmitQuotePanel requestId={request.id} />
        )}
      </div>
    </div>
  );
}
