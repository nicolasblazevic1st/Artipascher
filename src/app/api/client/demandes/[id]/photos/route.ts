import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import {
  MAX_PHOTOS,
  validatePhotoFile,
} from "@/lib/demandes-validation";
import {
  getWorkRequestForClient,
  setWorkRequestPhotos,
} from "@/lib/store";
import { deleteRequestPhoto, saveRequestPhotos } from "@/lib/uploads";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Met à jour les photos d'une demande : conserve une liste d'URLs et/ou ajoute
 * de nouveaux fichiers. Au moins 1 photo, maximum MAX_PHOTOS.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const workRequest = await getWorkRequestForClient(id, session.clientId);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
  }

  if (workRequest.status === "rejected") {
    return NextResponse.json(
      { error: "Impossible de modifier les photos d'une demande refusée." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const keepRaw = String(formData.get("keep") ?? "[]");
  let keep: string[] = [];
  try {
    const parsed = JSON.parse(keepRaw) as unknown;
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: "Liste de photos invalide." }, { status: 400 });
    }
    keep = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return NextResponse.json({ error: "Liste de photos invalide." }, { status: 400 });
  }

  const current = workRequest.photos ?? [];
  const currentSet = new Set(current);
  const keepValid = keep.filter((url) => currentSet.has(url));

  const photoEntries = formData.getAll("photos");
  const newFiles = photoEntries.filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  for (const file of newFiles) {
    const fileError = validatePhotoFile(file);
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }
  }

  const total = keepValid.length + newFiles.length;
  if (total < 1) {
    return NextResponse.json(
      { error: "Conservez au moins une photo de votre projet." },
      { status: 400 }
    );
  }
  if (total > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PHOTOS} photos autorisées.` },
      { status: 400 }
    );
  }

  const removed = current.filter((url) => !keepValid.includes(url));
  for (const url of removed) {
    await deleteRequestPhoto(id, url);
  }

  const added =
    newFiles.length > 0 ? await saveRequestPhotos(id, newFiles) : [];
  const nextPhotos = [...keepValid, ...added];
  await setWorkRequestPhotos(id, nextPhotos);

  return NextResponse.json({
    success: true,
    photos: nextPhotos,
  });
}
