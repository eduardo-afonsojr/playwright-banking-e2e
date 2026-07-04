/**
 * Resets the database to a known, deterministic state used by every test
 * layer (Playwright, Jest integration, Postman/Newman). Safe to run
 * repeatedly: it drops the relevant collections before re-seeding.
 */
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB ?? "banking";

export const SEED_USER = {
  username: "jane.doe",
  password: "Password123!",
  fullName: "Jane Doe",
};

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  await Promise.all(
    ["users", "accounts", "transactions", "sessions"].map((name) =>
      db
        .collection(name)
        .drop()
        .catch(() => undefined),
    ),
  );

  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db
    .collection("sessions")
    .createIndex({ token: 1 }, { unique: true });
  await db
    .collection("sessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  const userId = new ObjectId();
  const passwordHash = await bcrypt.hash(SEED_USER.password, 10);

  await db.collection("users").insertOne({
    _id: userId,
    username: SEED_USER.username,
    passwordHash,
    fullName: SEED_USER.fullName,
    createdAt: daysAgo(90),
  });

  const checkingId = new ObjectId();
  const savingsId = new ObjectId();

  await db.collection("accounts").insertMany([
    {
      _id: checkingId,
      userId,
      name: "Checking",
      type: "checking",
      currency: "USD",
      balance: 2500,
      createdAt: daysAgo(90),
    },
    {
      _id: savingsId,
      userId,
      name: "Savings",
      type: "savings",
      currency: "USD",
      balance: 10000,
      createdAt: daysAgo(90),
    },
  ]);

  // A spread of transfers between the two accounts, used by the
  // transaction-history filtering specs (by account and by date range).
  const transferHistory = [
    { fromId: checkingId, toId: savingsId, amount: 200, daysAgo: 35 },
    { fromId: savingsId, toId: checkingId, amount: 150, daysAgo: 28 },
    { fromId: checkingId, toId: savingsId, amount: 75, daysAgo: 20 },
    { fromId: savingsId, toId: checkingId, amount: 300, daysAgo: 14 },
    { fromId: checkingId, toId: savingsId, amount: 50, daysAgo: 7 },
    { fromId: savingsId, toId: checkingId, amount: 120, daysAgo: 2 },
  ];

  const transactionDocs = transferHistory.flatMap(
    ({ fromId, toId, amount, daysAgo: age }) => {
      const createdAt = daysAgo(age);
      return [
        {
          _id: new ObjectId(),
          accountId: fromId,
          counterpartyAccountId: toId,
          type: "transfer_out",
          amount,
          description: "Transfer",
          createdAt,
        },
        {
          _id: new ObjectId(),
          accountId: toId,
          counterpartyAccountId: fromId,
          type: "transfer_in",
          amount,
          description: "Transfer",
          createdAt,
        },
      ];
    },
  );

  await db.collection("transactions").insertMany(transactionDocs);

  console.log(`Seeded database "${dbName}":`);
  console.log(`  user: ${SEED_USER.username} / ${SEED_USER.password}`);
  console.log(`  accounts: Checking ($2,500.00), Savings ($10,000.00)`);
  console.log(`  transactions: ${transactionDocs.length}`);

  await client.close();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
