import { promises as fs } from "fs";
import path from "path";
import { normalizeNafCode } from "./naf-trade-groups";

const EXTRAS_PATH = path.join(
  process.cwd(),
  "data",
  "acquisition-naf-extras.json"
);

/**
 * Fichier extras conservé pour compat, mais l’acquisition ne l’utilise plus
 * (uniquement les 22 NAF des 16 métiers).
 */
export async function readAcquisitionNafExtras(): Promise<string[]> {
  try {
    const raw = await fs.readFile(EXTRAS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.map((c) => normalizeNafCode(String(c))).filter(Boolean)
      ),
    ].sort();
  } catch {
    return [];
  }
}

export async function addAcquisitionNafExtra(nafCode: string): Promise<string[]> {
  const code = normalizeNafCode(nafCode);
  if (!code) return readAcquisitionNafExtras();
  const current = await readAcquisitionNafExtras();
  if (current.includes(code)) return current;
  const next = [...current, code].sort();
  await fs.mkdir(path.dirname(EXTRAS_PATH), { recursive: true });
  await fs.writeFile(EXTRAS_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
