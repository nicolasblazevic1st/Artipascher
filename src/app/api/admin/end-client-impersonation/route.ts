import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { CLIENT_SESSION_COOKIE, getClientSession } from "@/lib/client-auth";

/** Quitte la session client ouverte par l'admin (garde la session admin). */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const session = await getClientSession();
  if (!session?.impersonatedByAdmin) {
    return NextResponse.json(
      { error: "Aucune session d'impersonation active." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    success: true,
    redirectTo: "/admin/particuliers/comptes",
  });
  response.cookies.set(CLIENT_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
