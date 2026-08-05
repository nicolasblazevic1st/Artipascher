/**
 * Aligne les enchères TEST : 1 devis validé = 1 enchère au même montant
 * (+ intérêt accepté + contact débloqué).
 *
 * Usage : node scripts/fix-test-bid-coherence.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");
const AUCTION_PREFIX = "auction-wr-test-";
const BID_PREFIX = "bid-wr-test-";
const PRO_EMAIL = "pro@test.artipascher.fr";

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function main() {
  const store = JSON.parse(await fs.readFile(STORE_PATH, "utf-8"));
  store.contactUnlocks ??= [];
  store.contactRequests ??= [];
  store.proQuotes ??= [];

  const pro =
    store.proRegistrations.find((p) => p.email?.toLowerCase() === PRO_EMAIL) ||
    store.proRegistrations.find((p) => p.id === "pro-test-001");

  if (!pro) {
    console.error("Compte pro test introuvable.");
    process.exit(1);
  }

  const testRequests = store.workRequests.filter(
    (r) => r.auctionId?.startsWith(AUCTION_PREFIX) && r.status === "approved"
  );

  let fixed = 0;

  for (const request of testRequests) {
    const auctionId = request.auctionId;
    const slug = auctionId.replace(AUCTION_PREFIX, "");
    const bids = store.bids
      .filter((b) => b.auctionId === auctionId && b.proId === pro.id)
      .sort((a, b) => a.amount - b.amount);

    if (bids.length === 0) continue;

    // Garde uniquement la meilleure (plus basse) enchère = l'offre réelle
    const keep = bids[0];
    const offerAmount = keep.amount;
    const removeIds = new Set(bids.slice(1).map((b) => b.id));
    if (removeIds.size > 0) {
      store.bids = store.bids.filter((b) => !removeIds.has(b.id));
    }

    // Normalise l'id de l'enchère conservée
    keep.id = `${BID_PREFIX}${slug}-1`;
    keep.fromQuoteId = `quote-test-${slug}`;
    keep.ocrAmount = offerAmount;
    keep.ocrMatchedLabel = "Total TTC (seed)";

    const hasRequest = store.contactRequests.some(
      (r) => r.proId === pro.id && r.auctionId === auctionId && r.status === "accepted"
    );
    if (!hasRequest) {
      store.contactRequests.unshift({
        id: `cr-test-${slug}`,
        auctionId,
        workRequestId: request.id,
        proId: pro.id,
        status: "accepted",
        createdAt: hoursAgo(14),
        expiresAt: daysFromNow(7),
        decidedAt: hoursAgo(13.5),
      });
    }

    const hasUnlock = store.contactUnlocks.some(
      (u) => u.proId === pro.id && u.auctionId === auctionId
    );
    if (!hasUnlock) {
      store.contactUnlocks.unshift({
        id: `unlock-test-${slug}`,
        proId: pro.id,
        auctionId,
        amountEur: 1,
        paidAt: hoursAgo(13),
      });
    }

    let quote = store.proQuotes.find(
      (q) => q.proId === pro.id && q.auctionId === auctionId && q.status === "approved"
    );
    if (!quote) {
      quote = {
        id: `quote-test-${slug}`,
        workRequestId: request.id,
        auctionId,
        proId: pro.id,
        companyName: pro.companyName || "Artisan test",
        visitDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        amount: offerAmount,
        description: `[TEST] Devis après visite — ${request.city}. Montant = enchère (${offerAmount} €).`,
        status: "approved",
        createdAt: hoursAgo(12),
        reviewedAt: hoursAgo(11),
        adminNote: "Devis TEST aligné sur l'unique enchère.",
      };
      store.proQuotes.unshift(quote);
    } else {
      quote.id = `quote-test-${slug}`;
      quote.amount = offerAmount;
      quote.description = `[TEST] Devis après visite — ${request.city}. Montant = enchère (${offerAmount} €).`;
      quote.adminNote = "Devis TEST aligné sur l'unique enchère.";
    }

    keep.fromQuoteId = quote.id;

    fixed += 1;
    console.log(
      `OK ${auctionId} — 1 devis + 1 enchère à ${offerAmount} €` +
        (removeIds.size ? ` (supprimé ${removeIds.size} enchère(s) en trop)` : "")
    );
  }

  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  console.log(`\n${fixed} chantier(s) TEST aligné(s) : 1 devis = 1 enchère.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
