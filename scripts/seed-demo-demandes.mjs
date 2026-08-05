/**
 * Crée un lot de demandes de travaux + enchères de démo (bandeau TEST).
 * Réutilise le compte particulier@test.artipascher.fr s'il existe.
 *
 * Usage : node scripts/seed-demo-demandes.mjs
 * Option  : --reset  remplace les demandes wr-test-* existantes
 */
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");
const RESET = process.argv.includes("--reset");

const CLIENT_EMAIL = "particulier@test.artipascher.fr";
const PRO_EMAIL = "pro@test.artipascher.fr";
const ID_PREFIX = "wr-test-";
const AUCTION_PREFIX = "auction-wr-test-";
const BID_PREFIX = "bid-wr-test-";

function createShareToken() {
  return randomBytes(12).toString("base64url");
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const EMPTY = {
  clientAccounts: [],
  proRegistrations: [],
  workRequests: [],
  contactUnlocks: [],
  contactRequests: [],
  artisanProspects: [],
  bids: [],
  proQuotes: [],
  passwordResetTokens: [],
  emailVerificationTokens: [],
  smsCampaigns: [],
  smsSettings: {},
  creditWallets: [],
  creditTransactions: [],
};

const DEMO_REQUESTS = [
  {
    slug: "peinture-lille",
    status: "approved",
    category: "Peinture",
    city: "Lille",
    department: "59",
    postalCode: "59000",
    addressLine: "12 rue de la Barre",
    description:
      "[TEST] Peinture complète d'un appartement T3 : salons, chambres et couloir. Préparation des murs, deux couches acrylique mate blanc cassé. Accès parking sous-sol.",
    startPrice: 2800,
    auctionDurationDays: 14,
    endsInDays: 10,
    previousQuoteAmount: 3200,
    photos: ["/demo/projets/demo-peinture.jpg"],
    /** Une seule enchère = le devis validé (même montant). */
    bids: [2480],
  },
  {
    slug: "plomberie-roubaix",
    status: "approved",
    category: "Plomberie",
    city: "Roubaix",
    department: "59",
    postalCode: "59100",
    addressLine: "45 avenue Jean Lebas",
    description:
      "[TEST] Remplacement chauffe-eau 200 L + reprise évacuation lavabo. Appartement RDC, accès aisé. Devis concurrent déjà obtenu.",
    startPrice: 1450,
    auctionDurationDays: 7,
    endsInDays: 5,
    previousQuoteAmount: 1600,
    photos: ["/demo/projets/demo-plomberie.jpg"],
    bids: [1380],
  },
  {
    slug: "electricite-arras",
    status: "approved",
    category: "Électricité",
    city: "Arras",
    department: "62",
    postalCode: "62000",
    addressLine: "8 place des Héros",
    description:
      "[TEST] Mise aux normes tableau électrique + ajout 6 prises USB dans cuisine et bureau. Maison année 70, compteur monophasé.",
    startPrice: 2100,
    auctionDurationDays: 21,
    endsInDays: 18,
    photos: ["/demo/projets/demo-electricite.jpg"],
    bids: [],
  },
  {
    slug: "toiture-lens",
    status: "approved",
    category: "Toiture / Couverture",
    city: "Lens",
    department: "62",
    postalCode: "62300",
    addressLine: "22 rue Casimir Beugnet",
    description:
      "[TEST] Remplacement 25 tuiles + traitement antimousse sur versant sud. Maison mitoyenne, échafaudage nécessaire côté rue.",
    startPrice: 3900,
    auctionDurationDays: 14,
    endsInDays: 12,
    photos: ["/demo/projets/demo-toiture.jpg"],
    /** Une seule enchère alignée sur le devis après visite. */
    bids: [3420],
  },
  {
    slug: "carrelage-valenciennes",
    status: "approved",
    category: "Carrelage / Revêtements de sol",
    city: "Valenciennes",
    department: "59",
    postalCode: "59300",
    addressLine: "3 rue Ferrand",
    description:
      "[TEST] Pose carrelage 60×60 salon + cuisine (45 m²) sur chape existante. Fourniture client déjà livrée.",
    startPrice: 4200,
    auctionDurationDays: 10,
    endsInDays: 8,
    photos: ["/demo/projets/demo-carrelage.jpg"],
    bids: [],
  },
  {
    slug: "menuiserie-dunkerque",
    status: "pending",
    category: "Menuiserie (fenêtres, portes, volets)",
    city: "Dunkerque",
    department: "59",
    postalCode: "59140",
    addressLine: "17 boulevard Sainte-Barbe",
    description:
      "[TEST] Remplacement de 4 fenêtres PVC double vitrage + porte d'entrée. Devis concurrent 6800 € fourni.",
    startPrice: 6200,
    auctionDurationDays: 14,
    previousQuoteAmount: 6800,
    photos: ["/demo/projets/demo-menuiserie.jpg"],
  },
  {
    slug: "placo-calais",
    status: "pending",
    category: "Placo / Cloisons",
    city: "Calais",
    department: "62",
    postalCode: "62100",
    addressLine: "9 rue Royale",
    description:
      "[TEST] Création de 2 cloisons BA13 + isolation phonique pour aménager un bureau dans un loft. Surface ~18 m².",
    startPrice: 2400,
    auctionDurationDays: 10,
    photos: ["/demo/projets/demo-placo.jpg"],
  },
  {
    slug: "chauffage-bethune",
    status: "pending",
    category: "Chauffage / Pompe à chaleur",
    city: "Béthune",
    department: "62",
    postalCode: "62400",
    addressLine: "56 rue d'Arras",
    description:
      "[TEST] Installation pompe à chaleur air/eau en remplacement chaudière fioul. Maison 120 m², radiateurs existants à conserver.",
    startPrice: 12500,
    auctionDurationDays: 30,
    previousQuoteAmount: 13800,
    photos: ["/demo/projets/demo-chauffage.jpg"],
  },
];

async function main() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  let store;
  try {
    store = { ...EMPTY, ...JSON.parse(await fs.readFile(STORE_PATH, "utf-8")) };
  } catch {
    store = { ...EMPTY };
  }

  for (const key of Object.keys(EMPTY)) {
    if (!Array.isArray(store[key]) && key !== "smsSettings") {
      store[key] = EMPTY[key];
    }
  }

  const client =
    store.clientAccounts.find((c) => c.email.toLowerCase() === CLIENT_EMAIL) ||
    store.clientAccounts[0];
  if (!client) {
    console.error(
      "Aucun compte particulier trouvé. Lancez d'abord : node scripts/seed-test-accounts.mjs"
    );
    process.exit(1);
  }

  const pro =
    store.proRegistrations.find((p) => p.email.toLowerCase() === PRO_EMAIL) ||
    store.proRegistrations.find((p) => p.status === "approved");

  const existingTestIds = new Set(
    store.workRequests.filter((r) => r.id.startsWith(ID_PREFIX)).map((r) => r.id)
  );

  if (existingTestIds.size > 0 && !RESET) {
    console.log(
      `${existingTestIds.size} demande(s) test déjà présentes. Relancez avec --reset pour les remplacer.`
    );
    console.log("Ids :", [...existingTestIds].join(", "));
    return;
  }

  if (RESET) {
    const auctionIds = new Set(
      store.workRequests
        .filter((r) => r.id.startsWith(ID_PREFIX) && r.auctionId)
        .map((r) => r.auctionId)
    );
    const workRequestIds = new Set(
      store.workRequests.filter((r) => r.id.startsWith(ID_PREFIX)).map((r) => r.id)
    );
    store.workRequests = store.workRequests.filter((r) => !r.id.startsWith(ID_PREFIX));
    store.bids = store.bids.filter(
      (b) => !b.id.startsWith(BID_PREFIX) && !auctionIds.has(b.auctionId)
    );
    store.contactUnlocks = (store.contactUnlocks ?? []).filter(
      (u) => !auctionIds.has(u.auctionId)
    );
    store.contactRequests = (store.contactRequests ?? []).filter(
      (r) => !auctionIds.has(r.auctionId) && !workRequestIds.has(r.workRequestId)
    );
    store.proQuotes = (store.proQuotes ?? []).filter(
      (q) => !auctionIds.has(q.auctionId) && !workRequestIds.has(q.workRequestId)
    );
  }

  const now = new Date().toISOString();
  let createdPending = 0;
  let createdApproved = 0;
  let createdBids = 0;

  for (const demo of DEMO_REQUESTS) {
    const id = `${ID_PREFIX}${demo.slug}`;
    const createdAt = hoursAgo(24 + createdPending + createdApproved);

    /** @type {import('../src/lib/store-types').WorkRequest} */
    const request = {
      id,
      firstName: client.firstName || "Camille",
      lastName: client.lastName || "Test",
      email: client.email,
      phone: client.phone || "0612345678",
      clientId: client.id,
      clientKind: client.kind || "individual",
      addressLine: demo.addressLine,
      postalCode: demo.postalCode,
      city: demo.city,
      department: demo.department,
      category: demo.category,
      description: demo.description,
      startPrice: demo.startPrice,
      startPriceMode: demo.startPrice != null ? "client" : "first_quote",
      auctionDurationDays: demo.auctionDurationDays,
      photos: demo.photos ?? [],
      status: demo.status,
      createdAt,
      isTest: true,
      previousQuoteAmount: demo.previousQuoteAmount,
      previousQuoteNote: demo.previousQuoteAmount
        ? "Devis concurrent fourni pour la démo TEST"
        : undefined,
    };

    if (demo.status === "approved") {
      const auctionId = `${AUCTION_PREFIX}${demo.slug}`;
      request.reviewedAt = hoursAgo(12);
      request.auctionId = auctionId;
      request.auctionEndsAt = daysFromNow(demo.endsInDays ?? 7);
      request.shareToken = createShareToken();
      createdApproved += 1;

      if (pro && Array.isArray(demo.bids) && demo.bids.length > 0) {
        const interestCreatedAt = hoursAgo(14);
        const unlockPaidAt = hoursAgo(13);
        const visitDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        // 1 devis = 1 enchère au même montant (parcours réaliste)
        const offerAmount = demo.bids[demo.bids.length - 1];

        store.contactRequests.unshift({
          id: `cr-test-${demo.slug}`,
          auctionId,
          workRequestId: id,
          proId: pro.id,
          status: "accepted",
          createdAt: interestCreatedAt,
          expiresAt: daysFromNow(7),
          decidedAt: hoursAgo(13.5),
        });

        store.contactUnlocks.unshift({
          id: `unlock-test-${demo.slug}`,
          proId: pro.id,
          auctionId,
          amountEur: 1,
          paidAt: unlockPaidAt,
        });

        store.proQuotes.unshift({
          id: `quote-test-${demo.slug}`,
          workRequestId: id,
          auctionId,
          proId: pro.id,
          companyName: pro.companyName || "Artisan test",
          visitDate,
          amount: offerAmount,
          description: `[TEST] Devis après visite — ${demo.category} à ${demo.city}. Montant = enchère déposée (${offerAmount} €).`,
          status: "approved",
          createdAt: hoursAgo(12),
          reviewedAt: hoursAgo(11),
          adminNote: "Devis TEST validé — aligné sur l'unique enchère démo.",
        });

        store.bids.unshift({
          id: `${BID_PREFIX}${demo.slug}-1`,
          auctionId,
          proId: pro.id,
          companyName: pro.companyName || "Artisan test",
          amount: offerAmount,
          feeEur: 1,
          createdAt: hoursAgo(10),
          fromQuoteId: `quote-test-${demo.slug}`,
          ocrAmount: offerAmount,
          ocrMatchedLabel: "Total TTC (seed)",
        });
        createdBids += 1;
      }
    } else {
      createdPending += 1;
    }

    store.workRequests.unshift(request);
  }

  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");

  console.log("Lot de demandes TEST prêt dans data/store.json\n");
  console.log(`  En attente : ${createdPending}`);
  console.log(`  Enchères   : ${createdApproved}`);
  console.log(`  Offres     : ${createdBids}`);
  console.log(`  Client     : ${client.email} (${client.id})`);
  console.log(`  Bandeau    : isTest=true sur chaque demande`);
  console.log("\nVoir : /encheres · /admin/particuliers/demandes · /admin/particuliers/encheres");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
