/**
 * Resets the database to a known, deterministic state used by every test
 * layer (Playwright, Jest integration, Postman/Newman). Safe to run
 * repeatedly: it drops the relevant collections before re-seeding.
 *
 * Exposed as a plain function so the CLI script (scripts/seed.ts) and the
 * Playwright setup project can share the exact same reset logic.
 */
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export const SEED_USER = {
  username: "jane.doe",
  password: "Password123!",
  fullName: "Jane Doe",
};

export const SEED_ACCOUNTS = {
  checking: { name: "Checking", balance: 2500 },
  savings: { name: "Savings", balance: 10000 },
};

/** Seeded transfers, in days-ago offsets from "now" at seed time. */
export const SEED_TRANSFERS = [
  { from: "checking", to: "savings", amount: 200, daysAgo: 35 },
  { from: "savings", to: "checking", amount: 150, daysAgo: 28 },
  { from: "checking", to: "savings", amount: 75, daysAgo: 20 },
  { from: "savings", to: "checking", amount: 300, daysAgo: 14 },
  { from: "checking", to: "savings", amount: 50, daysAgo: 7 },
  { from: "savings", to: "checking", amount: 120, daysAgo: 2 },
] as const;

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export interface SeedSummary {
  dbName: string;
  transactionCount: number;
}

export async function seedDatabase(options?: {
  uri?: string;
  dbName?: string;
}): Promise<SeedSummary> {
  const uri =
    options?.uri ?? process.env.MONGODB_URI ?? "mongodb://localhost:27017";
  const dbName = options?.dbName ?? process.env.MONGODB_DB ?? "banking";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  try {
    await Promise.all(
      ["users", "accounts", "transactions", "sessions"].map((name) =>
        db
          .collection(name)
          .drop()
          .catch(() => undefined),
      ),
    );

    await db
      .collection("users")
      .createIndex({ username: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
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

    const accountIds = {
      checking: new ObjectId(),
      savings: new ObjectId(),
    };

    await db.collection("accounts").insertMany([
      {
        _id: accountIds.checking,
        userId,
        name: SEED_ACCOUNTS.checking.name,
        type: "checking",
        currency: "USD",
        balance: SEED_ACCOUNTS.checking.balance,
        createdAt: daysAgo(90),
      },
      {
        _id: accountIds.savings,
        userId,
        name: SEED_ACCOUNTS.savings.name,
        type: "savings",
        currency: "USD",
        balance: SEED_ACCOUNTS.savings.balance,
        createdAt: daysAgo(90),
      },
    ]);

    // Each seeded transfer produces a debit/credit transaction pair, spread
    // over the last 35 days so date-range filtering has meaningful data.
    const transactionDocs = SEED_TRANSFERS.flatMap(
      ({ from, to, amount, daysAgo: age }) => {
        const createdAt = daysAgo(age);
        return [
          {
            _id: new ObjectId(),
            accountId: accountIds[from],
            counterpartyAccountId: accountIds[to],
            type: "transfer_out",
            amount,
            description: "Transfer",
            createdAt,
          },
          {
            _id: new ObjectId(),
            accountId: accountIds[to],
            counterpartyAccountId: accountIds[from],
            type: "transfer_in",
            amount,
            description: "Transfer",
            createdAt,
          },
        ];
      },
    );

    await db.collection("transactions").insertMany(transactionDocs);

    return { dbName, transactionCount: transactionDocs.length };
  } finally {
    await client.close();
  }
}
