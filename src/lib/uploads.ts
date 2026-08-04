import { promises as fs } from "fs";
import path from "path";

import type { ProDocument, ProTradeDocument } from "./store-types";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "demandes");
const PRO_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "pros");

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

export async function savePreviousQuoteProof(
  requestId: string,
  file: File
): Promise<string> {
  const dir = getRequestUploadDir(requestId);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const safeName = `devis-precedent-${Date.now()}${ext.replace(/[^a-zA-Z0-9.]/g, "")}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, safeName), buffer);
  return `/uploads/demandes/${requestId}/${safeName}`;
}

export function getProUploadDir(proId: string): string {
  return path.join(PRO_UPLOADS_ROOT, proId);
}

export async function saveProRegistrationDocuments(
  proId: string,
  files: Array<{ id: string; label: string; file: File }>
): Promise<ProDocument[]> {
  const dir = getProUploadDir(proId);
  await fs.mkdir(dir, { recursive: true });

  const uploadedAt = new Date().toISOString();
  const documents: ProDocument[] = [];

  for (const { id, label, file } of files) {
    const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
    const safeName = `${id}-${Date.now()}${ext.replace(/[^a-zA-Z0-9.]/g, "")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, safeName), buffer);
    documents.push({
      id,
      label,
      fileUrl: `/uploads/pros/${proId}/${safeName}`,
      fileName: file.name,
      uploadedAt,
    });
  }

  return documents;
}

export async function saveTradeDecennaleDocuments(
  proId: string,
  files: Array<{ tradeGroupId: string; tradeGroupLabel: string; file: File }>
): Promise<Record<string, ProTradeDocument>> {
  const dir = getProUploadDir(proId);
  await fs.mkdir(dir, { recursive: true });

  const uploadedAt = new Date().toISOString();
  const byGroup: Record<string, ProTradeDocument> = {};

  for (const { tradeGroupId, tradeGroupLabel, file } of files) {
    const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
    const safeName = `decennale-${tradeGroupId}-${Date.now()}${ext.replace(/[^a-zA-Z0-9.]/g, "")}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, safeName), buffer);
    byGroup[tradeGroupId] = {
      fileUrl: `/uploads/pros/${proId}/${safeName}`,
      fileName: file.name,
      uploadedAt,
    };
  }

  return byGroup;
}
