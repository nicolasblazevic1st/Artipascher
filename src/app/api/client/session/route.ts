import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { getClientById } from "@/lib/store";

export async function GET() {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const client = await getClientById(session.clientId);
  if (!client) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
  });
}
