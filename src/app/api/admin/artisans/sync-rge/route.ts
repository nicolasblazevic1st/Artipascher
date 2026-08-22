import { after, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { syncRgeDirectory } from "@/lib/rge-sync";

export const maxDuration = 300;

let rgeSyncRunning = false;

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (rgeSyncRunning) {
    return NextResponse.json(
      {
        error:
          "Une synchronisation RGE ADEME est déjà en cours. Réessayez dans quelques minutes.",
      },
      { status: 409 }
    );
  }

  rgeSyncRunning = true;
  after(async () => {
    try {
      const result = await syncRgeDirectory();
      console.info("[sync-rge] done", JSON.stringify(result));
    } catch (err) {
      console.error("[sync-rge] failed", err);
    } finally {
      rgeSyncRunning = false;
    }
  });

  return NextResponse.json({
    ok: true,
    started: true,
    async: true,
    message:
      "Sync RGE ADEME lancée (59 / 62). Import des fiches manquantes, puis complément Places si une demande exige une note Google. Rechargez la liste dans quelques minutes.",
  });
}
