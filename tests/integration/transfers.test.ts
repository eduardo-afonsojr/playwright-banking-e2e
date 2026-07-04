/**
 * Integration tests for POST /api/transfers against a real MongoDB.
 * The database is reseeded before each test: transfers mutate balances, so
 * every test starts from the exact same state.
 */
import { POST as transfersRoute } from "@/app/api/transfers/route";
import { seedDatabase, SEED_ACCOUNTS } from "@/lib/db/seed";
import {
  accountsCollection,
  transactionsCollection,
} from "@/lib/db/collections";
import { jsonRequest, loginAsSeedUser } from "../helpers/api";
import { setSessionToken } from "../helpers/mock-cookies";
import { closeDbClient } from "../helpers/db";

jest.mock("next/headers", () => ({
  cookies: () => require("../helpers/mock-cookies").mockCookieStore(),
}));

interface AccountIds {
  checking: string;
  savings: string;
}

async function getAccountIds(): Promise<AccountIds> {
  const accounts = await accountsCollection();
  const all = await accounts.find({}).toArray();
  const byName = (name: string) =>
    all.find((account) => account.name === name)!._id.toHexString();
  return {
    checking: byName(SEED_ACCOUNTS.checking.name),
    savings: byName(SEED_ACCOUNTS.savings.name),
  };
}

async function getBalance(idHex: string): Promise<number> {
  const accounts = await accountsCollection();
  const { ObjectId } = await import("mongodb");
  const account = await accounts.findOne({ _id: new ObjectId(idHex) });
  return account!.balance;
}

function transferRequest(body: unknown): Request {
  return jsonRequest("/api/transfers", "POST", body);
}

let ids: AccountIds;

beforeEach(async () => {
  await seedDatabase();
  ids = await getAccountIds();
  setSessionToken(await loginAsSeedUser());
});

afterAll(async () => {
  await closeDbClient();
});

describe("POST /api/transfers", () => {
  it("returns 401 without a session", async () => {
    setSessionToken(undefined);
    const response = await transfersRoute(
      transferRequest({
        fromAccountId: ids.checking,
        toAccountId: ids.savings,
        amount: 100,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("moves money and records a debit/credit transaction pair", async () => {
    const response = await transfersRoute(
      transferRequest({
        fromAccountId: ids.checking,
        toAccountId: ids.savings,
        amount: 100,
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.fromAccount.balance).toBe(
      SEED_ACCOUNTS.checking.balance - 100,
    );
    expect(body.toAccount.balance).toBe(SEED_ACCOUNTS.savings.balance + 100);

    // Balances are persisted, not just echoed back.
    expect(await getBalance(ids.checking)).toBe(
      SEED_ACCOUNTS.checking.balance - 100,
    );
    expect(await getBalance(ids.savings)).toBe(
      SEED_ACCOUNTS.savings.balance + 100,
    );

    // Both ledger entries exist for the new transfer.
    const transactions = await transactionsCollection();
    const { ObjectId } = await import("mongodb");
    const outgoing = await transactions.findOne({
      accountId: new ObjectId(ids.checking),
      type: "transfer_out",
      amount: 100,
    });
    const incoming = await transactions.findOne({
      accountId: new ObjectId(ids.savings),
      type: "transfer_in",
      amount: 100,
    });
    expect(outgoing).not.toBeNull();
    expect(incoming).not.toBeNull();
  });

  it.each([
    ["insufficient funds", 999999, "INSUFFICIENT_FUNDS"],
    ["a negative amount", -10, "INVALID_AMOUNT"],
    ["a zero amount", 0, "INVALID_AMOUNT"],
    ["sub-cent precision", 10.123, "INVALID_AMOUNT"],
  ])("rejects %s with 400 and does not change balances", async (
    _label,
    amount,
    code,
  ) => {
    const response = await transfersRoute(
      transferRequest({
        fromAccountId: ids.checking,
        toAccountId: ids.savings,
        amount,
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe(code);
    expect(await getBalance(ids.checking)).toBe(
      SEED_ACCOUNTS.checking.balance,
    );
    expect(await getBalance(ids.savings)).toBe(SEED_ACCOUNTS.savings.balance);
  });

  it("rejects a same-account transfer with 400", async () => {
    const response = await transfersRoute(
      transferRequest({
        fromAccountId: ids.checking,
        toAccountId: ids.checking,
        amount: 10,
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("SAME_ACCOUNT");
  });

  it("rejects an unknown account with 404", async () => {
    const response = await transfersRoute(
      transferRequest({
        fromAccountId: "000000000000000000000000",
        toAccountId: ids.savings,
        amount: 10,
      }),
    );
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("rejects a malformed body with 400", async () => {
    const response = await transfersRoute(
      transferRequest({ fromAccountId: ids.checking, amount: "100" }),
    );
    expect(response.status).toBe(400);
  });
});
