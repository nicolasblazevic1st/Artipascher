import { promises as fs } from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..");
const db = JSON.parse(
  await fs.readFile(path.join(ROOT, "data", "artisans-enrichment.json"), "utf8")
);

const bad =
  /\b(SCI|SCCV|LHDF|ASSOCIATION FONCIERE)\b/i;

const rows = db.artisans.filter(
  (a) =>
    a.status === "active" &&
    a.department === "59" &&
    !(a.phone && String(a.phone).trim()) &&
    !a.optedOut &&
    String(a.nafCode).startsWith("43.") &&
    a.companyName &&
    a.companyName.length > 3 &&
    !bad.test(a.companyName)
);

const step = Math.max(1, Math.floor(rows.length / 100));
const sample = [];
for (let i = 0; i < rows.length && sample.length < 100; i += step) {
  sample.push(rows[i]);
}

const outDir = path.join(ROOT, "data", "exports");
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "nord-sample-100-metiers.json");
await fs.writeFile(outPath, JSON.stringify(sample, null, 2));

console.log("pool", rows.length, "sample", sample.length);
sample.slice(0, 20).forEach((a, i) => {
  console.log(
    `${i + 1}|${a.companyName}|${a.city}|${a.nafCode}|${a.siret}`
  );
});
