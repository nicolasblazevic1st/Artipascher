import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { PRO_SESSION_COOKIE, getProSession } from "@/lib/pro-auth";

/** Quitte la session artisan ouverte par l'admin (garde la session admin). */
export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const session = await getProSession();
  if (!session?.impersonatedByAdmin) {
    return NextResponse.json(
      { error: "Aucune session d'impersonation active." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    success: true,
    redirectTo: "/admin/artisans/comptes",
  });
  response.cookies.set(PRO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
