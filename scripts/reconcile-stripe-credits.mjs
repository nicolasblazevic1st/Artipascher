/**
 * Crédite les Checkout Stripe payés manquants (filet si webhook bloqué).
 * Usage sur le VPS :
 *   node scripts/reconcile-stripe-credits.mjs [email]
 */
import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { resolve } from "path";

const require = createRequire(import.meta.url);
const root = process.cwd();
const storePath = resolve(root, "data/store.json");
const envPath = resolve(root, ".env.local");
const emailFilter = process.argv[2] || "n3.absent";

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    })
);

const Stripe = require(resolve(root, "node_modules/stripe"));
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const store = JSON.parse(readFileSync(storePath, "utf8"));
store.creditWallets ||= [];
store.creditTransactions ||= [];

const sessions = await stripe.checkout.sessions.list({ limit: 30 });
let credited = 0;

for (const session of sessions.data) {
  if (session.payment_status !== "paid") continue;
  if (session.metadata?.type !== "credit_purchase") continue;
  const email =
    session.customer_details?.email || session.customer_email || "";
  if (emailFilter && !email.includes(emailFilter)) continue;

  const proId = session.metadata.proId;
  const packSize = Number(session.metadata.packSize);
  const priceEur = Number(session.metadata.priceEur);
  if (!proId || !Number.isFinite(packSize) || packSize <= 0) continue;

  if (store.creditTransactions.some((t) => t.stripeSessionId === session.id)) {
    console.log("skip (déjà)", session.id, packSize);
    continue;
  }

  let wallet = store.creditWallets.find((w) => w.proId === proId);
  if (!wallet) {
    wallet = { proId, balance: 0, updatedAt: new Date().toISOString() };
    store.creditWallets.push(wallet);
  }
  wallet.balance += packSize;
  wallet.updatedAt = new Date().toISOString();
  store.creditTransactions.unshift({
    id: `ctx-reconcile-${Date.now().toString(36)}-${credited}`,
    proId,
    type: "purchase",
    amount: packSize,
    amountEur: Number.isFinite(priceEur) ? priceEur : session.amount_total / 100,
    balanceAfter: wallet.balance,
    stripeSessionId: session.id,
    note: `Achat pack ${packSize} crédits (réconciliation)`,
    createdAt: new Date().toISOString(),
  });
  credited += 1;
  console.log("OK +", packSize, "→", wallet.balance, session.id);
}

if (credited > 0) {
  writeFileSync(storePath, JSON.stringify(store, null, 2));
  console.log("Écrit", storePath, "·", credited, "session(s)");
} else {
  console.log("Rien à créditer.");
}
