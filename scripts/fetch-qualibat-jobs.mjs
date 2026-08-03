import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const SOURCE_URL =
  "https://www.qualibat.com/annuaire-entreprises-qualifiees?form_particular%5Brge%5D=0&form_particular%5Bproject_or_job%5D=job";

async function fetchHtml() {
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Artipascher/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseJobs(html) {
  const match = html.match(
    /<select id="form_particular_jobs"[^>]*>([\s\S]*?)<\/select>/
  );
  if (!match) throw new Error("Select form_particular_jobs introuvable.");

  const jobs = [];
  const optionRe =
    /<option value="([^"]*)"(?: selected="selected")?>([^<]*)<\/option>/g;

  for (const [, value, label] of match[1].matchAll(optionRe)) {
    if (!value) continue;
    jobs.push({
      id: Number(value),
      label: label
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .trim(),
    });
  }

  return jobs;
}

async function main() {
  const html = process.argv.includes("--local")
    ? await readFile(path.join(root, "tmp-qualibat2.html"), "utf8")
    : await fetchHtml();

  const jobs = parseJobs(html);
  const outDir = path.join(root, "data");
  await mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, "qualibat-jobs.json");
  await writeFile(jsonPath, JSON.stringify(jobs, null, 2), "utf8");

  const tsPath = path.join(root, "src/lib/qualibat-jobs.ts");
  const ts = `/** Liste des métiers Qualibat (annuaire particulier, champ jobs). */
export interface QualibatJob {
  id: number;
  label: string;
}

/** Généré depuis https://www.qualibat.com/annuaire-entreprises-qualifiees — \`node scripts/fetch-qualibat-jobs.mjs\` */
export const QUALIBAT_JOBS: QualibatJob[] = ${JSON.stringify(jobs, null, 2)} as const;

export function getQualibatJobLabel(id: number): string | undefined {
  return QUALIBAT_JOBS.find((job) => job.id === id)?.label;
}
`;
  await writeFile(tsPath, ts, "utf8");

  console.log(`✓ ${jobs.length} métiers → ${jsonPath}`);
  console.log(`✓ ${tsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
