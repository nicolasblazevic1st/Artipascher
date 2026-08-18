import { after, NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { syncSireneWeekly } from "@/lib/sirene-extract";

export const maxDuration = 300;

/** Une seule sync à la fois (PM2 fork / instance unique). */
let sireneSyncRunning = false;

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (sireneSyncRunning) {
    return NextResponse.json(
      {
        error:
          "Une synchronisation SIRENE est déjà en cours. Réessayez dans quelques minutes.",
      },
      { status: 409 }
    );
  }

  let maxPagesPerNaf = 2;
  let full = false;
  // Le géocode BAN se fait à part (bouton dédié) — trop lent dans la sync HTTP.
  let geocodeMissing = false;
  try {
    const body = await request.json();
    full = body.full === true;
    if (typeof body.maxPagesPerNaf === "number") {
      maxPagesPerNaf = Math.max(1, Math.min(400, Math.floor(body.maxPagesPerNaf)));
    }
    if (typeof body.geocodeMissing === "boolean") {
      geocodeMissing = body.geocodeMissing;
    }
  } catch {
    // ok
  }

  const options = {
    full,
    maxPagesPerNaf: full ? undefined : maxPagesPerNaf,
    geocodeMissing: full ? false : geocodeMissing,
    markMissingClosed: false,
  };

  sireneSyncRunning = true;

  // Réponse immédiate : évite les 504 Nginx / HTML non-JSON pendant les sync longues.
  after(async () => {
    try {
      const result = await syncSireneWeekly(options);
      console.info(
        "[extract-sirene] done",
        JSON.stringify({
          full,
          upserted: result.upserted,
          pages: result.pages,
          geocoded: result.geocoded,
          errors: result.errors,
        })
      );
    } catch (err) {
      console.error("[extract-sirene] failed", err);
    } finally {
      sireneSyncRunning = false;
    }
  });

  return NextResponse.json({
    ok: true,
    started: true,
    async: true,
    message: full
      ? "Sync SIRENE complète lancée (toute la base NPC, plusieurs minutes). Rechargez la liste ensuite."
      : "Sync rapide SIRENE lancée (quelques pages / métier). Rechargez la liste dans une à deux minutes.",
  });
}
