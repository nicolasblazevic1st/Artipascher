/**
 * Artisans démo avec documents OK / faux / absents pour chaque niveau (1–3).
 * Usage : node scripts/seed-demo-artisans-documents.mjs
 *
 * Mot de passe commun : Test1234
 * Voir aussi : /admin/documents-artisans
 */
import { randomBytes, scryptSync } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STORE_PATH = path.join(ROOT, "data", "store.json");
const UPLOADS_ROOT = path.join(ROOT, "public", "uploads", "pros");

const PASSWORD = "Test1234";

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** PDF minimal lisible (texte visible dans beaucoup de lecteurs). */
function makePdf(lines) {
  const escaped = lines
    .map((line, i) => {
      const safe = String(line).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      const y = 750 - i * 22;
      return `BT /F1 12 Tf 50 ${y} Td (${safe}) Tj ET`;
    })
    .join("\n");
  const stream = `${escaped}\n`;
  const objects = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj"
  );
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}endstream\nendobj`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj");

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj + "\n";
  }
  const xrefStart = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

async function writeDoc(proId, fileName, lines) {
  const dir = path.join(UPLOADS_ROOT, proId);
  await fs.mkdir(dir, { recursive: true });
  const abs = path.join(dir, fileName);
  await fs.writeFile(abs, makePdf(lines));
  return `/uploads/pros/${proId}/${fileName}`;
}

function tradeSelection(status, decennaleDoc) {
  return {
    tradeGroupId: "peinture",
    tradeGroupLabel: "Peinture",
    qualibatJobId: 0,
    qualibatJobLabel: "Peinture intérieure",
    category: "peinture",
    decennaleStatus: status,
    ...(decennaleDoc ? { decennaleDocument: decennaleDoc } : {}),
  };
}

function basePro(opts) {
  const now = opts.now;
  return {
    id: opts.id,
    companyName: opts.companyName,
    siret: opts.siret,
    siren: opts.siret.slice(0, 9),
    email: opts.email,
    phone: opts.phone ?? "0320000000",
    city: opts.city ?? "Lille",
    department: "59",
    category: "peinture",
    tradeSelections: opts.tradeSelections ?? [],
    tradeGroupId: "peinture",
    tradeGroupLabel: "Peinture",
    rcsVerified: opts.rcsVerified ?? true,
    level1Audit: {
      rcsVerifiedAt: now,
      geoVerified: true,
      geoDepartment: "59",
      autoValidatedAt: opts.status === "approved" ? now : undefined,
    },
    level1CertifiedAt: opts.level1CertifiedAt,
    qualificationLevel: opts.qualificationLevel,
    documents: opts.documents ?? [],
    passwordHash: opts.passwordHash,
    status: opts.status,
    createdAt: now,
    reviewedAt: now,
    adminNote: opts.adminNote,
    referralCode: opts.referralCode,
    emailVerified: true,
    emailVerifiedAt: now,
  };
}

const DEMO_PROS = [
  // ——— Niveau 1 ———
  {
    id: "pro-demo-n1-ok",
    email: "n1.ok@test.artipascher.fr",
    companyName: "N1 Docs OK — Peinture Certifiée",
    siret: "55210055400013",
    qualificationLevel: 1,
    status: "approved",
    scenario: "ok",
    adminNote: "Démo N1 — documents conformes (pas fake).",
  },
  {
    id: "pro-demo-n1-fake",
    email: "n1.fake@test.artipascher.fr",
    companyName: "N1 Docs FAKE — Plomberie Frauduleuse",
    siret: "44306184100047",
    qualificationLevel: 1,
    status: "approved",
    scenario: "fake",
    adminNote: "Démo N1 — documents FAKE à modérer / niveau 0.",
  },
  {
    id: "pro-demo-n1-absent",
    email: "n1.absent@test.artipascher.fr",
    companyName: "N1 Docs ABSENTS — Menuiserie Vide",
    siret: "39959808200012",
    qualificationLevel: 1,
    status: "pending",
    scenario: "absent",
    adminNote: "Démo N1 — aucun document transmis.",
  },
  // ——— Niveau 2 ———
  {
    id: "pro-demo-n2-ok",
    email: "n2.ok@test.artipascher.fr",
    companyName: "N2 Docs OK — Isolation RGE",
    siret: "79452181400012",
    qualificationLevel: 2,
    status: "approved",
    scenario: "ok",
    adminNote: "Démo N2 — RC + décennale + RGE + Qualibat OK.",
  },
  {
    id: "pro-demo-n2-fake",
    email: "n2.fake@test.artipascher.fr",
    companyName: "N2 Docs FAKE — Labels Bidons",
    siret: "81234567800019",
    qualificationLevel: 2,
    status: "approved",
    scenario: "fake",
    adminNote: "Démo N2 — RGE / Qualibat FAKE.",
  },
  {
    id: "pro-demo-n2-absent",
    email: "n2.absent@test.artipascher.fr",
    companyName: "N2 Docs ABSENTS — Chauffage Incomplet",
    siret: "82123456700018",
    qualificationLevel: 2,
    status: "approved",
    scenario: "absent",
    adminNote: "Démo N2 — niveau 2 sans RGE ni Qualibat.",
  },
  // ——— Niveau 3 ———
  {
    id: "pro-demo-n3-ok",
    email: "n3.ok@test.artipascher.fr",
    companyName: "N3 Docs OK — Premium Partenaire",
    siret: "83123456700017",
    qualificationLevel: 3,
    status: "approved",
    scenario: "ok",
    adminNote: "Démo N3 — Premium validé (charte + références OK).",
  },
  {
    id: "pro-demo-n3-fake",
    email: "n3.fake@test.artipascher.fr",
    companyName: "N3 Docs FAKE — Faux Premium",
    siret: "84123456700016",
    qualificationLevel: 3,
    status: "approved",
    scenario: "fake",
    adminNote: "Démo N3 — fausses références Premium à rejeter.",
  },
  {
    id: "pro-demo-n3-absent",
    email: "n3.absent@test.artipascher.fr",
    companyName: "N3 Docs ABSENTS — Premium En Attente",
    siret: "85123456700015",
    qualificationLevel: 3,
    status: "approved",
    scenario: "absent",
    adminNote: "Démo N3 — Premium sans pièces partenaires.",
  },
];

async function buildDocuments(def, passwordHash, now) {
  const id = def.id;
  const docs = [];
  let tradeSelections = [];
  let level1CertifiedAt;

  if (def.scenario === "absent" && def.qualificationLevel === 1) {
    return {
      documents: [],
      tradeSelections: [tradeSelection("en_attente_verification")],
      level1CertifiedAt: undefined,
      status: def.status,
    };
  }

  // Niveau 1 de base pour tous sauf absent N1
  if (def.scenario === "ok") {
    const rcUrl = await writeDoc(id, "rc-ok.pdf", [
      "ARTIPASCHER DEMO — RC PRO CONFORME",
      def.companyName,
      `SIRET ${def.siret}`,
      "Assureur: AXA DEMO",
      "Validite: 31/12/2027",
      "STATUT: DOCUMENT AUTHENTIQUE (test)",
    ]);
    const kbisUrl = await writeDoc(id, "kbis-ok.pdf", [
      "ARTIPASCHER DEMO — KBIS CONFORME",
      def.companyName,
      `SIRET ${def.siret}`,
      "Extrait RCS < 3 mois",
    ]);
    const decUrl = await writeDoc(id, "decennale-ok.pdf", [
      "ARTIPASCHER DEMO — DECENNALE CONFORME",
      "Metier: Peinture",
      def.companyName,
      "Couverture valide",
    ]);
    docs.push(
      {
        id: "rc",
        label: "Assurance responsabilité civile professionnelle",
        fileUrl: rcUrl,
        fileName: "rc-ok.pdf",
        uploadedAt: now,
        verificationStatus: "validé",
        ocrHints: { companyName: def.companyName, siret: def.siret, insurer: "AXA DEMO" },
      },
      {
        id: "kbis",
        label: "KBIS / extrait RCS (< 3 mois)",
        fileUrl: kbisUrl,
        fileName: "kbis-ok.pdf",
        uploadedAt: now,
        verificationStatus: "validé",
      }
    );
    tradeSelections = [
      tradeSelection("validé", {
        fileUrl: decUrl,
        fileName: "decennale-ok.pdf",
        uploadedAt: now,
      }),
    ];
    level1CertifiedAt = now;
  }

  if (def.scenario === "fake") {
    const rcUrl = await writeDoc(id, "rc-FAKE.pdf", [
      "!!! DOCUMENT FAKE — NE PAS VALIDER !!!",
      "Photoshop / montage de test",
      def.companyName,
      "Assureur: ASSURANCE INEXISTANTE SA",
      "STATUT: FRAUDE SIMULEE",
    ]);
    const decUrl = await writeDoc(id, "decennale-FAKE.pdf", [
      "!!! DECENNALE FAKE !!!",
      "Scan illegible / SIRET incohérent",
      "SIRET 00000000000000",
    ]);
    docs.push({
      id: "rc",
      label: "Assurance responsabilité civile professionnelle",
      fileUrl: rcUrl,
      fileName: "rc-FAKE.pdf",
      uploadedAt: now,
      verificationStatus: "en_attente_verification",
      ocrHints: {
        companyName: "SOCIETE INCONNUE",
        siret: "00000000000000",
        insurer: "ASSURANCE INEXISTANTE SA",
        rawSnippet: "FAKE DOCUMENT — incohérence SIRET / raison sociale",
      },
      consistencyIssues: [
        {
          field: "siret",
          message: "SIRET OCR différent du compte (fraude simulée).",
          severity: "error",
        },
      ],
    });
    tradeSelections = [
      tradeSelection("en_attente_verification", {
        fileUrl: decUrl,
        fileName: "decennale-FAKE.pdf",
        uploadedAt: now,
      }),
    ];
    // volontairement encore "approved" pour tester le bouton niveau 0
    level1CertifiedAt = now;
  }

  if (def.scenario === "absent" && def.qualificationLevel >= 2) {
    // N1 minimal OK pour pouvoir être N2/N3, mais pièces N2/N3 absentes
    const rcUrl = await writeDoc(id, "rc-ok.pdf", [
      "RC PRO OK (base N1)",
      def.companyName,
      `SIRET ${def.siret}`,
    ]);
    const decUrl = await writeDoc(id, "decennale-ok.pdf", [
      "DECENNALE OK (base N1)",
      def.companyName,
    ]);
    docs.push({
      id: "rc",
      label: "Assurance responsabilité civile professionnelle",
      fileUrl: rcUrl,
      fileName: "rc-ok.pdf",
      uploadedAt: now,
      verificationStatus: "validé",
    });
    tradeSelections = [
      tradeSelection("validé", {
        fileUrl: decUrl,
        fileName: "decennale-ok.pdf",
        uploadedAt: now,
      }),
    ];
    level1CertifiedAt = now;
  }

  // Niveau 2 docs
  if (def.qualificationLevel >= 2 && def.scenario === "ok") {
    const rgeUrl = await writeDoc(id, "rge-ok.pdf", [
      "LABEL RGE CONFORME",
      def.companyName,
      "Domaine: isolation",
    ]);
    const qualibatUrl = await writeDoc(id, "qualibat-ok.pdf", [
      "QUALIBAT CONFORME",
      def.companyName,
      "Qualification metier OK",
    ]);
    docs.push(
      {
        id: "rge",
        label: "Label RGE",
        fileUrl: rgeUrl,
        fileName: "rge-ok.pdf",
        uploadedAt: now,
        verificationStatus: "validé",
      },
      {
        id: "qualibat",
        label: "Qualibat ou qualification métier",
        fileUrl: qualibatUrl,
        fileName: "qualibat-ok.pdf",
        uploadedAt: now,
        verificationStatus: "validé",
      }
    );
  }

  if (def.qualificationLevel >= 2 && def.scenario === "fake") {
    const rgeUrl = await writeDoc(id, "rge-FAKE.pdf", [
      "!!! FAUX LABEL RGE !!!",
      "Certificat invente pour test admin",
    ]);
    const qualibatUrl = await writeDoc(id, "qualibat-FAKE.pdf", [
      "!!! FAUX QUALIBAT !!!",
      "Ne pas valider",
    ]);
    docs.push(
      {
        id: "rge",
        label: "Label RGE",
        fileUrl: rgeUrl,
        fileName: "rge-FAKE.pdf",
        uploadedAt: now,
        verificationStatus: "en_attente_verification",
        consistencyIssues: [
          {
            field: "rge",
            message: "Numéro RGE introuvable (fraude simulée).",
            severity: "error",
          },
        ],
      },
      {
        id: "qualibat",
        label: "Qualibat ou qualification métier",
        fileUrl: qualibatUrl,
        fileName: "qualibat-FAKE.pdf",
        uploadedAt: now,
        verificationStatus: "rejeté",
      }
    );
  }

  // Niveau 3 — pas d'upload catalogue, on simule des pièces "partenaires"
  if (def.qualificationLevel === 3 && def.scenario === "ok") {
    const charteUrl = await writeDoc(id, "charte-premium-ok.pdf", [
      "CHARTE QUALITE ARTIPASCHER SIGNEE",
      def.companyName,
      "Partenaire Premium valide",
    ]);
    const refsUrl = await writeDoc(id, "references-nord-ok.pdf", [
      "REFERENCES CHANTIERS NORD VERIFIEES",
      "Lille / Roubaix / Tourcoing",
    ]);
    docs.push(
      {
        id: "charte_premium",
        label: "Charte qualité Artipascher (Premium)",
        fileUrl: charteUrl,
        fileName: "charte-premium-ok.pdf",
        uploadedAt: now,
        verificationStatus: "validé",
      },
      {
        id: "references_premium",
        label: "Références chantiers Nord (Premium)",
        fileUrl: refsUrl,
        fileName: "references-nord-ok.pdf",
        uploadedAt: now,
        verificationStatus: "validé",
      }
    );
  }

  if (def.qualificationLevel === 3 && def.scenario === "fake") {
    const charteUrl = await writeDoc(id, "charte-premium-FAKE.pdf", [
      "!!! FAUSSE CHARTE PREMIUM !!!",
      "Signature inventee",
    ]);
    docs.push({
      id: "charte_premium",
      label: "Charte qualité Artipascher (Premium)",
      fileUrl: charteUrl,
      fileName: "charte-premium-FAKE.pdf",
      uploadedAt: now,
      verificationStatus: "en_attente_verification",
      consistencyIssues: [
        {
          field: "charte",
          message: "Signature non authentique (fraude simulée).",
          severity: "error",
        },
      ],
    });
  }

  // N3 absent: uniquement base N1, pas de pièces premium (déjà géré)

  return {
    documents: docs,
    tradeSelections,
    level1CertifiedAt,
    status: def.status,
  };
}

async function main() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });

  let store;
  try {
    store = JSON.parse(await fs.readFile(STORE_PATH, "utf-8"));
  } catch {
    store = {
      clientAccounts: [],
      proRegistrations: [],
      creditWallets: [],
      creditTransactions: [],
    };
  }
  store.proRegistrations = store.proRegistrations ?? [];
  store.creditWallets = store.creditWallets ?? [];
  store.creditTransactions = store.creditTransactions ?? [];

  const passwordHash = hashPassword(PASSWORD);
  const now = new Date().toISOString();
  const created = [];

  for (const def of DEMO_PROS) {
    const built = await buildDocuments(def, passwordHash, now);
    const pro = basePro({
      ...def,
      passwordHash,
      now,
      documents: built.documents,
      tradeSelections: built.tradeSelections,
      level1CertifiedAt: built.level1CertifiedAt,
      status: built.status,
      referralCode: `AP${def.id.replace(/[^A-Z0-9]/gi, "").slice(-6).toUpperCase().padEnd(6, "X")}`,
    });

    const existingIndex = store.proRegistrations.findIndex((p) => p.id === def.id);
    if (existingIndex >= 0) {
      store.proRegistrations[existingIndex] = pro;
    } else {
      store.proRegistrations.unshift(pro);
    }

    let wallet = store.creditWallets.find((w) => w.proId === pro.id);
    if (!wallet) {
      wallet = { proId: pro.id, balance: 5, updatedAt: now };
      store.creditWallets.push(wallet);
      store.creditTransactions.unshift({
        id: newId("ctx"),
        proId: pro.id,
        type: "demo_grant",
        amount: 5,
        balanceAfter: 5,
        note: "Crédits démo documents",
        createdAt: now,
      });
    }

    created.push({
      id: pro.id,
      email: pro.email,
      level: pro.qualificationLevel,
      scenario: def.scenario,
      status: pro.status,
      docs: pro.documents.length,
    });
  }

  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");

  console.log("Artisans démo documents prêts (mdp: Test1234)\n");
  console.log("Niveau | Scénario | Email                              | Docs | Statut");
  console.log("-------|----------|------------------------------------|------|--------");
  for (const row of created) {
    console.log(
      `N${row.level}     | ${row.scenario.padEnd(8)} | ${row.email.padEnd(34)} | ${String(row.docs).padStart(4)} | ${row.status}`
    );
  }
  console.log("\nAdmin → /admin/documents-artisans");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
