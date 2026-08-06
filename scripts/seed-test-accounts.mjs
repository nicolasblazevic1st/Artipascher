/**
 * Crée / réinitialise les comptes de test particulier + pro dans data/store.json.
 * Usage : node scripts/seed-test-accounts.mjs
 */
import { randomBytes, scryptSync } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "..", "data", "store.json");

const PASSWORD = "Test1234";
const CLIENT_EMAIL = "particulier@test.artipascher.fr";
const PRO_EMAIL = "pro@test.artipascher.fr";

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  const passwordHash = hashPassword(PASSWORD);
  const now = new Date().toISOString();

  let client = store.clientAccounts.find(
    (c) => c.email.toLowerCase() === CLIENT_EMAIL
  );
  if (client) {
    client.passwordHash = passwordHash;
    client.firstName = client.firstName || "Camille";
    client.lastName = client.lastName || "Test";
    client.phone = client.phone || "0612345678";
    client.kind = "individual";
    client.isTestAccount = true;
  } else {
    client = {
      id: "client-test-001",
      email: CLIENT_EMAIL,
      passwordHash,
      firstName: "Camille",
      lastName: "Test",
      phone: "0612345678",
      kind: "individual",
      isTestAccount: true,
      emailVerified: true,
      emailVerifiedAt: now,
      createdAt: now,
    };
    store.clientAccounts.push(client);
  }
  client.emailVerified = true;
  client.emailVerifiedAt = client.emailVerifiedAt || now;

  let pro = store.proRegistrations.find(
    (p) => p.email.toLowerCase() === PRO_EMAIL
  );
  if (pro) {
    pro.passwordHash = passwordHash;
    pro.status = "approved";
    pro.isTestAccount = true;
    pro.rcsVerified = true;
    pro.qualificationLevel = pro.qualificationLevel ?? 1;
    pro.level1CertifiedAt = pro.level1CertifiedAt ?? now;
    pro.reviewedAt = now;
    if (!pro.referralCode) pro.referralCode = "APTEST01";
  } else {
    pro = {
      id: "pro-test-001",
      companyName: "Artipascher Test SARL",
      siret: "55210055400013",
      siren: "552100554",
      email: PRO_EMAIL,
      phone: "0320000000",
      city: "Lille",
      department: "59",
      category: "peinture",
      tradeSelections: [
        {
          tradeGroupId: "peinture",
          tradeGroupLabel: "Peinture",
          qualibatJobId: 0,
          qualibatJobLabel: "Peinture intérieure",
          category: "peinture",
          decennaleStatus: "validé",
        },
      ],
      tradeGroupId: "peinture",
      tradeGroupLabel: "Peinture",
      rcsVerified: true,
      level1Audit: {
        rcsVerifiedAt: now,
        geoVerified: true,
        geoDepartment: "59",
        autoValidatedAt: now,
      },
      level1CertifiedAt: now,
      qualificationLevel: 1,
      documents: [],
      passwordHash,
      status: "approved",
      createdAt: now,
      reviewedAt: now,
      referralCode: "APTEST01",
      isTestAccount: true,
      emailVerified: true,
      emailVerifiedAt: now,
    };
    store.proRegistrations.unshift(pro);
  }
  pro.emailVerified = true;
  pro.emailVerifiedAt = pro.emailVerifiedAt || now;

  let wallet = store.creditWallets.find((w) => w.proId === pro.id);
  if (!wallet) {
    wallet = { proId: pro.id, balance: 10, updatedAt: now };
    store.creditWallets.push(wallet);
    store.creditTransactions.unshift({
      id: newId("ctx"),
      proId: pro.id,
      type: "demo_grant",
      amount: 10,
      balanceAfter: 10,
      note: "Crédits initiaux compte test",
      createdAt: now,
    });
  } else if (wallet.balance < 5) {
    const add = 10 - wallet.balance;
    wallet.balance = 10;
    wallet.updatedAt = now;
    store.creditTransactions.unshift({
      id: newId("ctx"),
      proId: pro.id,
      type: "demo_grant",
      amount: add,
      balanceAfter: 10,
      note: "Recharge crédits compte test",
      createdAt: now,
    });
  }

  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");

  console.log("Comptes de test prêts dans data/store.json\n");
  console.log("Particulier");
  console.log(`  URL   : /particulier/espace/login`);
  console.log(`  Email : ${CLIENT_EMAIL}`);
  console.log(`  MDP   : ${PASSWORD}`);
  console.log(`  Id    : ${client.id}\n`);
  console.log("Pro");
  console.log(`  URL   : /pro/login`);
  console.log(`  Email : ${PRO_EMAIL}`);
  console.log(`  MDP   : ${PASSWORD}`);
  console.log(`  Id    : ${pro.id}`);
  console.log(`  Code parrainage : ${pro.referralCode}`);
  console.log(`  Crédits : ${wallet.balance}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
