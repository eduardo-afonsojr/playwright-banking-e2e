/**
 * Integration tests for GET /api/accounts against a real MongoDB.
 */
import { GET as accountsRoute } from "@/app/api/accounts/route";
import { seedDatabase, SEED_ACCOUNTS } from "@/lib/db/seed";
import { loginAsSeedUser } from "../helpers/api";
import { setSessionToken } from "../helpers/mock-cookies";
import { closeDbClient } from "../helpers/db";

jest.mock("next/headers", () => ({
  cookies: () => require("../helpers/mock-cookies").mockCookieStore(),
}));

beforeAll(async () => {
  await seedDatabase();
});

afterAll(async () => {
  await closeDbClient();
});

beforeEach(() => {
  setSessionToken(undefined);
});

describe("GET /api/accounts", () => {
  it("returns 401 without a session", async () => {
    const response = await accountsRoute();
    expect(response.status).toBe(401);
  });

  it("returns 401 for an unknown session token", async () => {
    setSessionToken("forged-token");
    const response = await accountsRoute();
    expect(response.status).toBe(401);
  });

  it("returns the seeded accounts for an authenticated user", async () => {
    setSessionToken(await loginAsSeedUser());

    const response = await accountsRoute();
    expect(response.status).toBe(200);

    const { accounts } = await response.json();
    expect(accounts).toHaveLength(2);
    expect(accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: SEED_ACCOUNTS.checking.name,
          type: "checking",
          currency: "USD",
          balance: SEED_ACCOUNTS.checking.balance,
        }),
        expect.objectContaining({
          name: SEED_ACCOUNTS.savings.name,
          type: "savings",
          currency: "USD",
          balance: SEED_ACCOUNTS.savings.balance,
        }),
      ]),
    );
    // Ids are serialized as strings, and no Mongo internals leak out.
    for (const account of accounts) {
      expect(typeof account.id).toBe("string");
      expect(account._id).toBeUndefined();
      expect(account.userId).toBeUndefined();
    }
  });
});
