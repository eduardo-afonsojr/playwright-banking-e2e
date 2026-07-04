/**
 * Integration tests for GET /api/transactions and its filters against a
 * real MongoDB with the deterministic seed data.
 */
import { GET as transactionsRoute } from "@/app/api/transactions/route";
import { seedDatabase, SEED_ACCOUNTS, SEED_TRANSFERS } from "@/lib/db/seed";
import { accountsCollection } from "@/lib/db/collections";
import { loginAsSeedUser } from "../helpers/api";
import { setSessionToken } from "../helpers/mock-cookies";
import { closeDbClient } from "../helpers/db";

jest.mock("next/headers", () => ({
  cookies: () => require("../helpers/mock-cookies").mockCookieStore(),
}));

function getRequest(query = ""): Request {
  return new Request(`http://localhost/api/transactions${query}`);
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

let checkingId: string;

beforeAll(async () => {
  await seedDatabase();
  const accounts = await accountsCollection();
  const checking = await accounts.findOne({
    name: SEED_ACCOUNTS.checking.name,
  });
  checkingId = checking!._id.toHexString();
});

afterAll(async () => {
  await closeDbClient();
});

beforeEach(async () => {
  setSessionToken(await loginAsSeedUser());
});

describe("GET /api/transactions", () => {
  it("returns 401 without a session", async () => {
    setSessionToken(undefined);
    const response = await transactionsRoute(getRequest());
    expect(response.status).toBe(401);
  });

  it("returns all seeded transactions, newest first", async () => {
    const response = await transactionsRoute(getRequest());
    expect(response.status).toBe(200);

    const { transactions } = await response.json();
    expect(transactions).toHaveLength(SEED_TRANSFERS.length * 2);

    const dates = transactions.map((t: { createdAt: string }) => t.createdAt);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it("filters by account", async () => {
    const response = await transactionsRoute(
      getRequest(`?accountId=${checkingId}`),
    );
    expect(response.status).toBe(200);

    const { transactions } = await response.json();
    // Every seeded transfer touches both accounts, so one entry per transfer.
    expect(transactions).toHaveLength(SEED_TRANSFERS.length);
    for (const transaction of transactions) {
      expect(transaction.accountId).toBe(checkingId);
    }
  });

  it("filters by date range (inclusive)", async () => {
    const from = isoDaysAgo(30);
    const to = isoDaysAgo(1);
    const response = await transactionsRoute(
      getRequest(`?from=${from}&to=${to}`),
    );
    expect(response.status).toBe(200);

    const { transactions } = await response.json();
    const expected =
      SEED_TRANSFERS.filter((t) => t.daysAgo <= 30 && t.daysAgo >= 1).length *
      2;
    expect(transactions).toHaveLength(expected);
    for (const transaction of transactions) {
      const day = transaction.createdAt.slice(0, 10);
      expect(day >= from && day <= to).toBe(true);
    }
  });

  it("combines account and date filters", async () => {
    const from = isoDaysAgo(30);
    const to = isoDaysAgo(1);
    const response = await transactionsRoute(
      getRequest(`?accountId=${checkingId}&from=${from}&to=${to}`),
    );

    const { transactions } = await response.json();
    const expected = SEED_TRANSFERS.filter(
      (t) => t.daysAgo <= 30 && t.daysAgo >= 1,
    ).length;
    expect(transactions).toHaveLength(expected);
  });

  it("returns an empty list when nothing matches", async () => {
    const response = await transactionsRoute(
      getRequest(`?from=${isoDaysAgo(365)}&to=${isoDaysAgo(300)}`),
    );
    const { transactions } = await response.json();
    expect(transactions).toEqual([]);
  });

  it("rejects an invalid accountId with 400", async () => {
    const response = await transactionsRoute(getRequest("?accountId=nope"));
    expect(response.status).toBe(400);
  });

  it("rejects another user's (or unknown) account with 404", async () => {
    const response = await transactionsRoute(
      getRequest("?accountId=000000000000000000000000"),
    );
    expect(response.status).toBe(404);
  });

  it("rejects an invalid date with 400", async () => {
    const response = await transactionsRoute(getRequest("?from=not-a-date"));
    expect(response.status).toBe(400);
  });
});
