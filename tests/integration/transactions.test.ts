/**
 * Integration tests for GET /api/transactions and its filters against a
 * real MongoDB with the deterministic seed data.
 */
import { GET as transactionsRoute } from "@/app/api/transactions/route";
import { seedDatabase, SEED_ACCOUNTS, SEED_TRANSFERS } from "@/lib/db/seed";
import { TRANSACTIONS_PAGE_SIZE } from "@/lib/pagination";
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

  it("returns the first page newest first, with pagination metadata", async () => {
    const response = await transactionsRoute(getRequest());
    expect(response.status).toBe(200);

    const { transactions, pagination } = await response.json();
    expect(transactions).toHaveLength(TRANSACTIONS_PAGE_SIZE);
    expect(pagination).toEqual({
      page: 1,
      pageSize: TRANSACTIONS_PAGE_SIZE,
      totalCount: SEED_TRANSFERS.length * 2,
      totalPages: Math.ceil(
        (SEED_TRANSFERS.length * 2) / TRANSACTIONS_PAGE_SIZE,
      ),
    });

    const dates = transactions.map((t: { createdAt: string }) => t.createdAt);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it("returns the remaining entries on the last page", async () => {
    const response = await transactionsRoute(getRequest("?page=2"));
    expect(response.status).toBe(200);

    const { transactions, pagination } = await response.json();
    expect(transactions).toHaveLength(
      SEED_TRANSFERS.length * 2 - TRANSACTIONS_PAGE_SIZE,
    );
    expect(pagination.page).toBe(2);
  });

  it("paginates without repeating or skipping entries", async () => {
    // Debit/credit pairs share a createdAt, so this exercises the _id
    // tiebreaker: page 1 + page 2 must partition the full set exactly.
    const [first, second] = await Promise.all([
      transactionsRoute(getRequest("?page=1")),
      transactionsRoute(getRequest("?page=2")),
    ]);
    const pageOne = (await first.json()).transactions;
    const pageTwo = (await second.json()).transactions;

    const ids = [...pageOne, ...pageTwo].map((t: { id: string }) => t.id);
    expect(ids).toHaveLength(SEED_TRANSFERS.length * 2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respects a custom pageSize", async () => {
    const response = await transactionsRoute(getRequest("?pageSize=5&page=3"));
    const { transactions, pagination } = await response.json();
    expect(transactions).toHaveLength(2);
    expect(pagination).toEqual({
      page: 3,
      pageSize: 5,
      totalCount: 12,
      totalPages: 3,
    });
  });

  it("returns an empty page past the end, keeping the metadata", async () => {
    const response = await transactionsRoute(getRequest("?page=99"));
    expect(response.status).toBe(200);
    const { transactions, pagination } = await response.json();
    expect(transactions).toEqual([]);
    expect(pagination.totalCount).toBe(SEED_TRANSFERS.length * 2);
  });

  it.each([
    ["zero", "?page=0"],
    ["negative", "?page=-1"],
    ["non-numeric", "?page=abc"],
    ["fractional", "?page=1.5"],
  ])("rejects a %s page with 400", async (_label, query) => {
    const response = await transactionsRoute(getRequest(query));
    expect(response.status).toBe(400);
  });

  it.each([
    ["zero", "?pageSize=0"],
    ["above the maximum", "?pageSize=101"],
    ["non-numeric", "?pageSize=big"],
  ])("rejects a pageSize %s with 400", async (_label, query) => {
    const response = await transactionsRoute(getRequest(query));
    expect(response.status).toBe(400);
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
