/**
 * Supprime les demandes / offres / devis liés qui ne sont PAS marqués isTest,
 * et applique startPriceMode sur les demandes TEST restantes.
 *
 * Usage :
 *   node scripts/cleanup-non-test-auctions.mjs
 *   node scripts/cleanup-non-test-auctions.mjs --dry-run
 */
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");
const DRY_RUN = process.argv.includes("--dry-run");

function isTestRequest(r) {
  return r?.isTest === true || String(r?.id ?? "").startsWith("wr-test-");
}

function inferStartPriceMode(request) {
  if (
    request.startPriceMode === "client" ||
    request.startPriceMode === "first_quote" ||
    request.startPriceMode === "unspecified"
  ) {
    return request.startPriceMode;
  }
  if (request.startPrice != null && request.startPriceQuoteId == null) {
    return "client";
  }
  if (request.startPriceQuoteId != null) {
    return "first_quote";
  }
  return "first_quote";
}

async function main() {
  const raw = await fs.readFile(STORE_PATH, "utf8");
  const store = JSON.parse(raw);

  const workRequests = store.workRequests ?? [];
  const keepRequests = workRequests.filter(isTestRequest);
  const removeRequests = workRequests.filter((r) => !isTestRequest(r));
  const testRequestIds = new Set(keepRequests.map((r) => r.id));
  const testAuctionIds = new Set(
    keepRequests.map((r) => r.auctionId).filter(Boolean)
  );

  const bids = store.bids ?? [];
  const keepBids = bids.filter((b) => testAuctionIds.has(b.auctionId));

  const proQuotes = store.proQuotes ?? [];
  const keepQuotes = proQuotes.filter(
    (q) =>
      testRequestIds.has(q.workRequestId) ||
      (q.auctionId && testAuctionIds.has(q.auctionId))
  );

  const contactUnlocks = store.contactUnlocks ?? [];
  const keepUnlocks = contactUnlocks.filter(
    (u) =>
      (u.auctionId && testAuctionIds.has(u.auctionId)) ||
      (u.workRequestId && testRequestIds.has(u.workRequestId))
  );

  const contactRequests = store.contactRequests ?? [];
  const keepContactRequests = contactRequests.filter(
    (c) =>
      (c.auctionId && testAuctionIds.has(c.auctionId)) ||
      (c.workRequestId && testRequestIds.has(c.workRequestId))
  );

  // Legacy auctions array if present
  if (Array.isArray(store.auctions)) {
    store.auctions = store.auctions.filter(
      (a) =>
        a?.isTest === true ||
        String(a?.id ?? "").startsWith("auction-wr-test-") ||
        testAuctionIds.has(a?.id) ||
        (a?.workRequestId && testRequestIds.has(a.workRequestId))
    );
  }

  const updatedRequests = keepRequests.map((r) => ({
    ...r,
    isTest: true,
    startPriceMode: inferStartPriceMode(r),
  }));

  console.log("Avant :");
  console.log(
    `  workRequests ${workRequests.length} (non-test à supprimer : ${removeRequests.length})`
  );
  console.log(`  bids ${bids.length}`);
  console.log(`  proQuotes ${proQuotes.length}`);
  console.log("Après (TEST uniquement) :");
  console.log(`  workRequests ${updatedRequests.length}`);
  console.log(`  bids ${keepBids.length}`);
  console.log(`  proQuotes ${keepQuotes.length}`);
  for (const r of updatedRequests) {
    console.log(
      `  - ${r.id} · ${r.category} ${r.city} · startPrice=${r.startPrice ?? "—"} · mode=${r.startPriceMode}`
    );
  }

  if (DRY_RUN) {
    console.log("Dry-run : aucune écriture.");
    return;
  }

  store.workRequests = updatedRequests;
  store.bids = keepBids;
  store.proQuotes = keepQuotes;
  store.contactUnlocks = keepUnlocks;
  store.contactRequests = keepContactRequests;

  const backupPath = `${STORE_PATH}.bak-cleanup-${Date.now()}`;
  await fs.copyFile(STORE_PATH, backupPath);
  await fs.writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  console.log(`Écrit ${STORE_PATH}`);
  console.log(`Backup ${backupPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
