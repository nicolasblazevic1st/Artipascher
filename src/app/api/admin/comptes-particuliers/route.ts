import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  deleteClientAccountByAdmin,
  readStore,
  setClientContactBlock,
} from "@/lib/store";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const store = await readStore();
  const accounts = store.clientAccounts
    .map((client) => {
      const requests = store.workRequests.filter(
        (r) =>
          r.clientId === client.id ||
          (!r.clientId && r.email.toLowerCase() === client.email.toLowerCase())
      );
      const { passwordHash: _passwordHash, ...safe } = client;
      return {
        ...safe,
        kind: client.kind ?? "individual",
        emailVerified: client.emailVerified !== false,
        ghostClaimsUpheld: client.ghostClaimsUpheld ?? 0,
        blockedFromContact: Boolean(client.blockedFromContact),
        blockedAt: client.blockedAt,
        adminNote: client.adminNote,
        requestsCount: requests.length,
        pendingRequests: requests.filter((r) => r.status === "pending").length,
        activeAuctions: requests.filter((r) => r.status === "approved").length,
        lastRequestAt: requests
          .map((r) => r.createdAt)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
      };
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return NextResponse.json({
    accounts,
    stats: {
      total: accounts.length,
      individuals: accounts.filter((a) => a.kind === "individual").length,
      companies: accounts.filter((a) => a.kind === "company").length,
      emailUnverified: accounts.filter((a) => a.emailVerified === false).length,
      withRequests: accounts.filter((a) => a.requestsCount > 0).length,
      blocked: accounts.filter((a) => a.blockedFromContact).length,
    },
  });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let clientId = "";
  let blocked = false;
  let adminNote: string | undefined;
  try {
    const body = await request.json();
    clientId = String(body.clientId ?? "").trim();
    blocked = body.blocked === true;
    if (typeof body.adminNote === "string") adminNote = body.adminNote;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!clientId) {
    return NextResponse.json({ error: "clientId requis." }, { status: 400 });
  }

  const result = await setClientContactBlock({ clientId, blocked, adminNote });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    clientId: result.id,
    blockedFromContact: Boolean(result.blockedFromContact),
    ghostClaimsUpheld: result.ghostClaimsUpheld ?? 0,
  });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let clientId = "";
  let confirmEmail = "";
  try {
    const body = await request.json();
    clientId = String(body.clientId ?? "").trim();
    confirmEmail = String(body.confirmEmail ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!clientId || !confirmEmail) {
    return NextResponse.json(
      { error: "clientId et confirmEmail requis." },
      { status: 400 }
    );
  }

  const store = await readStore();
  const client = store.clientAccounts.find((c) => c.id === clientId);
  if (!client) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }
  if (client.email.toLowerCase() !== confirmEmail) {
    return NextResponse.json(
      { error: "L'email de confirmation ne correspond pas." },
      { status: 400 }
    );
  }

  const result = await deleteClientAccountByAdmin(clientId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    anonymizedRequests: result.anonymizedRequests,
  });
}
