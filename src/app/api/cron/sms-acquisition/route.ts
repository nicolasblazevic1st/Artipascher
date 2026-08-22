import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isCronAuthorized } from "@/lib/cron-auth";
import {
  cancelPendingBatchesIfObjectivesMet,
  runAllActiveAcquisitionTicks,
} from "@/lib/sms-campaigns";

/**
 * mode=prepare (défaut) : prépare les lots pour le lendemain (sans OVH si revue).
 * mode=presend : annule les lots du jour si places pleines ou quota SMS atteint.
 */
export async function POST(request: NextRequest) {
  const admin = await isAdminAuthenticated();
  if (!admin && !isCronAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const mode =
    request.nextUrl.searchParams.get("mode") === "presend"
      ? "presend"
      : "prepare";

  if (mode === "presend") {
    const result = await cancelPendingBatchesIfObjectivesMet();
    return NextResponse.json({ ok: true, mode, ...result });
  }

  const result = await runAllActiveAcquisitionTicks();
  return NextResponse.json({
    ok: true,
    mode,
    processed: result.processed,
    results: result.results.map((r) => ({
      acquisitionId: r.acquisition.id,
      workRequestId: r.acquisition.workRequestId,
      status: r.acquisition.status,
      acceptedCount: r.acceptedCount,
      scheduledForDate: r.batch?.scheduledForDate,
      batchStatus: r.batch?.status,
      recipientCount: r.batch?.recipientCount ?? 0,
      skippedReason: r.skippedReason,
    })),
  });
}
