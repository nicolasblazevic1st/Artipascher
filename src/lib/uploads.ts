import { promises as fs } from "fs";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "demandes");

export function getRequestUploadDir(requestId: string): string {
  return path.join(UPLOADS_ROOT, requestId);
}

export async function saveRequestPhotos(
  requestId: string,
  files: File[]
): Promise<string[]> {
  const dir = getRequestUploadDir(requestId);
  await fs.mkdir(dir, { recursive: true });

  const savedPaths: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.name) || ".jpg";
    const safeName = `${Date.now()}-${i}${ext.replace(/[^a-zA-Z0-9.]/g, "")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, safeName), buffer);
    savedPaths.push(`/uploads/demandes/${requestId}/${safeName}`);
  }

  return savedPaths;
}
