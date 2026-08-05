import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readStore } from "@/lib/store";

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
    },
  });
}
