import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  MAX_PHOTOS,
  validatePhotoFile,
} from "@/lib/demandes-validation";
import { getWorkRequestById, setWorkRequestPhotos } from "@/lib/store";
import { deleteRequestPhoto, saveRequestPhotos } from "@/lib/uploads";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { id } = await context.params;
  const workRequest = await getWorkRequestById(id);
  if (!workRequest) {
    return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
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

  const added = newFiles.length > 0 ? await saveRequestPhotos(id, newFiles) : [];
  const nextPhotos = [...keepValid, ...added];
  await setWorkRequestPhotos(id, nextPhotos);

  return NextResponse.json({
    success: true,
    photos: nextPhotos,
  });
}
