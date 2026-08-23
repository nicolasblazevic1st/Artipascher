import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isCronAuthorized } from "@/lib/cron-auth";
import { sendReadyPendingBatches } from "@/lib/sms-campaigns";

/**
 * Seule tâche cron SMS : envoyer les lots cochés « prêt à partir ».
 * Planifier lun–sam 8h Europe/Paris. Les anciens modes prepare / presend
 * ne font plus rien (un crontab oublié ne prépare plus ni n’envoie à 18h).
 */
export async function POST(request: NextRequest) {
  const admin = await isAdminAuthenticated();
  if (!admin && !isCronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode") ?? "send";
  if (mode === "prepare" || mode === "presend") {
    return NextResponse.json({
      ok: true,
      mode,
      skipped: true,
      message:
        "Cron SMS : seule l’action send (8h, lots prêts à partir) est active.",
    });
  }

  const result = await sendReadyPendingBatches();
  return NextResponse.json({ ok: true, mode: "send", ...result });
}
