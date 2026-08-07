/**
 * Génère docs/naf-codes-a-conserver.md — liste à cocher par métier Artipascher.
 * Usage: node scripts/generate-naf-review-list.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** Ordre des métiers = catégories travaux Artipascher (src/lib/naf-codes.ts). */
const METIER_NAF = {
  Peinture: ["43.34Z"],
  Plomberie: ["43.22A", "43.22B"],
  Électricité: ["43.21A"],
  Maçonnerie: ["43.99C", "43.11Z"],
  Isolation: ["43.29A", "43.29B"],
  "Chauffage / Pompe à chaleur": ["43.22B", "43.21A"],
  "Rénovation énergétique": ["43.21A", "43.29A", "43.34Z"],
  "Rénovation complète": ["43.99C", "41.20A", "43.34Z"],
  "Menuiserie (fenêtres, portes, volets)": ["43.32A", "43.32B"],
  "Toiture / Couverture": ["43.91A", "43.91B"],
  "Carrelage / Revêtements de sol": ["43.33Z"],
  "Placo / Cloisons": ["43.31Z", "43.29B"],
  "Extérieur / Aménagement paysager": ["81.30Z", "43.99C"],
  Terrassement: ["43.12A", "43.12B"],
  Serrurerie: ["43.32B", "25.11Z"],
  "Nettoyage / Multi-services": ["81.21Z", "81.22Z", "81.29B"],
};

const METIER_ORDER = Object.keys(METIER_NAF);

const ALL_METIER_NAF = new Set(
  Object.values(METIER_NAF).flat().map((c) => c.toUpperCase())
);

const LABELS = {
  "41.10A": "Promotion immobilière de logements",
  "41.10B": "Promotion immobilière de bureaux",
  "41.10C": "Promotion immobilière d'autres bâtiments",
  "41.10D": "Supports juridiques de programmes",
  "41.20A": "Construction de maisons individuelles",
  "41.20B": "Construction d'autres bâtiments",
  "42.11Z": "Construction de routes et autoroutes",
  "42.12Z": "Construction de voies ferrées",
  "42.13A": "Construction d'ouvrages d'art",
  "42.13B": "Construction et entretien de tunnels",
  "42.21Z": "Construction de réseaux pour fluides",
  "42.22Z": "Construction de réseaux électriques",
  "42.91Z": "Construction d'ouvrages maritimes",
  "42.99Z": "Construction d'autres ouvrages de génie civil",
  "43.11Z": "Travaux de démolition",
  "43.12A": "Travaux de terrassement courants",
  "43.12B": "Travaux de terrassement spécialisés ou de grande masse",
  "43.13Z": "Travaux de fondations",
  "43.21A": "Travaux d'installation électrique",
  "43.21B": "Travaux d'installation électrique sur la voie publique",
  "43.22A": "Travaux d'installation d'eau et de gaz",
  "43.22B": "Travaux d'installation d'équipements thermiques et de climatisation",
  "43.29A": "Travaux d'isolation",
  "43.29B": "Travaux de menuiserie et de fermeture",
  "43.31Z": "Travaux de plâtrerie",
  "43.32A": "Travaux de menuiserie bois et PVC",
  "43.32B": "Travaux de menuiserie métallique et serrurerie",
  "43.33Z": "Travaux de revêtement des sols et des murs",
  "43.34Z": "Travaux de peinture et vitrerie",
  "43.39Z": "Autres travaux de finition",
  "43.91A": "Travaux de charpente",
  "43.91B": "Travaux de couverture",
  "43.99A": "Travaux d'étanchéification",
  "43.99B": "Travaux de montage de structures métalliques",
  "43.99C": "Travaux de maçonnerie générale et gros œuvre",
  "43.99D": "Autres travaux spécialisés de construction",
  "43.99E": "Location avec opérateur de matériel de construction",
  "25.11Z": "Fabrication de structures métalliques",
  "25.12Z": "Fabrication de portes et fenêtres en métal",
  "81.21Z": "Nettoyage courant des bâtiments",
  "81.22Z": "Autres activités de nettoyage des bâtiments",
  "81.29B": "Autres activités de nettoyage",
  "81.30Z": "Services d'aménagement paysager",
  "68.20A": "Location de terrains et d'autres biens immobiliers",
  "68.20B": "Location de terrains et d'autres biens immobiliers",
  "68.31Z": "Agences immobilières",
  "70.10Z": "Activités des sièges sociaux",
  "47.91B": "Vente à distance sur catalogue spécialisé",
  "47.52A": "Commerce de détail de quincaillerie",
  "46.73A": "Commerce de gros de bois et matériaux de construction",
  "52.10B": "Entreposage et stockage non frigorifique",
};

function label(code) {
  return LABELS[code] ?? `Activité NAF ${code}`;
}

function isSectionBtp(code) {
  return (
    code.startsWith("41.") ||
    code.startsWith("42.") ||
    code.startsWith("43.")
  );
}

function otherMetiers(code, currentMetier) {
  const out = [];
  for (const [metier, codes] of Object.entries(METIER_NAF)) {
    if (metier === currentMetier) continue;
    if (codes.includes(code)) out.push(metier);
  }
  return out;
}

function defaultChecked(sectionKind, count) {
  if (sectionKind === "hors-btp") return false;
  if (sectionKind === "autres-btp") return count >= 20;
  return true;
}

function renderTable(rows, sectionKind) {
  if (!rows.length) {
    return "_Aucun établissement avec ces codes dans la base._\n\n";
  }
  let md = `| Garder | Code | Libellé | Établ. | Aussi dans |\n`;
  md += `|:------:|:-----|:--------|-------:|:-----------|\n`;
  for (const row of rows) {
    const box = defaultChecked(sectionKind, row.count) ? "[x]" : "[ ]";
    const aussi =
      row.aussi?.length > 0 ? row.aussi.join(", ") : "—";
    md += `| ${box} | **${row.naf}** | ${label(row.naf)} | ${row.count.toLocaleString("fr-FR")} | ${aussi} |\n`;
  }
  return `${md}\n`;
}

async function main() {
  const raw = await fs.readFile(
    path.join(ROOT, "data", "artisans-enrichment.json"),
    "utf-8"
  );
  const db = JSON.parse(raw);
  const counts = new Map();
  for (const a of db.artisans) {
    if (a.status !== "active") continue;
    const n = String(a.nafCode ?? "").trim().toUpperCase();
    if (!n) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }

  const allCodes = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const totalEtab = allCodes.reduce((s, [, c]) => s + c, 0);

  let md = `# Codes NAF — choix par métier Artipascher

Base artisans NPC (59/62) · généré le ${new Date().toLocaleDateString("fr-FR")}

**${allCodes.length} codes distincts** · **${totalEtab.toLocaleString("fr-FR")} établissements actifs**

## Comment utiliser ce fichier

- Coche \`[x]\` les codes NAF à **garder** dans la base d'acquisition.
- Laisse \`[ ]\` vide pour **exclure**.
- Regroupement par **métier Artipascher** (catégories travaux de la plateforme).
- Compte = nombre d'**établissements** (SIRET) avec ce NAF principal.
- Un même code peut apparaître sous plusieurs métiers (colonne « Aussi dans ») — **le choix porte sur le code NAF**, pas sur le métier.

---

`;

  for (const metier of METIER_ORDER) {
    const codes = METIER_NAF[metier];
    const rows = codes
      .map((naf) => ({
        naf,
        count: counts.get(naf) ?? 0,
        aussi: otherMetiers(naf, metier),
      }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

    const subtotal = rows.reduce((s, r) => s + r.count, 0);
    md += `## ${metier}\n\n`;
    md += `*${rows.length} code(s) présent(s) · ${subtotal.toLocaleString("fr-FR")} établissements*\n\n`;
    md += renderTable(rows, "metier");
  }

  const autresBtp = allCodes
    .filter(([naf]) => isSectionBtp(naf) && !ALL_METIER_NAF.has(naf))
    .map(([naf, count]) => ({ naf, count, aussi: [] }));

  const horsBtp = allCodes
    .filter(([naf]) => !isSectionBtp(naf) && !ALL_METIER_NAF.has(naf))
    .map(([naf, count]) => ({ naf, count, aussi: [] }));

  const subBtp = autresBtp.reduce((s, r) => s + r.count, 0);
  md += `## Autres codes BTP (41 / 42 / 43 non rattachés à un métier)\n\n`;
  md += `*${autresBtp.length} codes · ${subBtp.toLocaleString("fr-FR")} établissements*\n\n`;
  md += renderTable(autresBtp, "autres-btp");

  const subHors = horsBtp.reduce((s, r) => s + r.count, 0);
  md += `## Hors BTP\n\n`;
  md += `*${horsBtp.length} codes · ${subHors.toLocaleString("fr-FR")} établissements*\n\n`;
  md += renderTable(horsBtp, "hors-btp");

  md += `---

Quand tu as fini, dis-moi quels codes garder (ou envoie ce fichier coché) et j'applique la sélection dans le code.
`;

  const out = path.join(ROOT, "docs", "naf-codes-a-conserver.md");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, md, "utf-8");
  console.log(`Écrit: ${out}`);
  console.log(`${allCodes.length} codes, ${totalEtab} établissements`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
