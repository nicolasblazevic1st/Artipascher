import { NextRequest, NextResponse } from "next/server";
import { workRequestToClientContactAddress } from "@/lib/client-address";
import { getClientContact, type ClientContact } from "@/lib/client-contacts";
import { getProSession } from "@/lib/pro-auth";
import { hasContactUnlock } from "@/lib/store";
import { getWorkRequestByAuctionId } from "@/lib/work-request-auctions";

type RouteParams = { params: Promise<{ auctionId: string }> };

async function resolveClientContact(auctionId: string): Promise<ClientContact | null> {
  const staticContact = getClientContact(auctionId);
  if (staticContact) return staticContact;

  const request = await getWorkRequestByAuctionId(auctionId);
  if (!request) return null;

  const { address, postalCode } = workRequestToClientContactAddress(request);

  return {
    auctionId,
    firstName: request.firstName,
    lastName: request.lastName,
    email: request.email,
    phone: request.phone?.trim() || "Non renseigné",
    phoneVerified: Boolean(request.phoneVerifiedAt),
    address,
    postalCode,
    companyName: request.companyName,
    clientSiret: request.clientSiret,
    clientKind: request.clientKind ?? "individual",
    workScope: request.workScope,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const session = await getProSession();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { auctionId } = await params;
  const unlocked = await hasContactUnlock(session.proId, auctionId);

  if (!unlocked) {
    return NextResponse.json(
      {
        error:
          "Accès non débloqué. Une mise en contact (solde selon le ticket du chantier) est requise.",
        unlocked: false,
      },
      { status: 403 }
    );
  }

  const contact = await resolveClientContact(auctionId);
  if (!contact) {
    return NextResponse.json({ error: "Contact introuvable." }, { status: 404 });
  }

  return NextResponse.json({ unlocked: true, contact });
}
