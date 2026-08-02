import { NextRequest, NextResponse } from "next/server";
import { getClientContact } from "@/lib/client-contacts";
import { getProSession } from "@/lib/pro-auth";
import { hasContactUnlock } from "@/lib/store";

type RouteParams = { params: Promise<{ auctionId: string }> };

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
      { error: "Accès non débloqué. Payez 1 € pour voir les coordonnées.", unlocked: false },
      { status: 403 }
    );
  }

  const contact = getClientContact(auctionId);
  if (!contact) {
    return NextResponse.json({ error: "Contact introuvable." }, { status: 404 });
  }

  return NextResponse.json({ unlocked: true, contact });
}
