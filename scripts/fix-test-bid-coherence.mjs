/**
 * Aligne les enchères TEST existantes avec le parcours réel :
 * intérêt accepté → déblocage contact → devis validé → enchères.
 *
 * Usage : node scripts/fix-test-bid-coherence.mjs
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");
const AUCTION_PREFIX = "auction-wr-test-";
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
    (r) =>
      r.auctionId?.startsWith(AUCTION_PREFIX) &&
      r.status === "approved"
  );

  let fixed = 0;

  for (const request of testRequests) {
    const auctionId = request.auctionId;
    const bids = store.bids.filter(
      (b) => b.auctionId === auctionId && b.proId === pro.id
    );
    if (bids.length === 0) continue;

    const slug = auctionId.replace(AUCTION_PREFIX, "");
    const maxBid = Math.max(...bids.map((b) => b.amount));
    const quoteAmount = Math.max(request.startPrice ?? 0, maxBid);

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
      (q) =>
        q.proId === pro.id &&
        q.auctionId === auctionId &&
        q.status === "approved"
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
        amount: quoteAmount,
        description: `[TEST] Devis après visite — parcours cohérent pour ${request.city}.`,
        status: "approved",
        createdAt: hoursAgo(12),
        reviewedAt: hoursAgo(11),
        adminNote: "Devis TEST validé pour parcours démo cohérent.",
      };
      store.proQuotes.unshift(quote);
    }

    for (const bid of bids) {
      if (!bid.fromQuoteId) bid.fromQuoteId = quote.id;
    }

    fixed += 1;
    console.log(
      `OK ${auctionId} — ${bids.length} enchère(s), contact débloqué, devis ${quoteAmount} €`
    );
  }

  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  console.log(`\n${fixed} chantier(s) TEST aligné(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
