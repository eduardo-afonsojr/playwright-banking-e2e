import { test, expect } from "../fixtures/test";
import { SEED_ACCOUNTS } from "../fixtures/test-data";
import { formatCurrency } from "../../src/lib/format";

test.describe("Accounts dashboard", () => {
  test("lists the user's accounts with balances matching the API", async ({
    dashboardPage,
    request,
  }) => {
    // The API is the source of truth for balances: other specs in the suite
    // legitimately move money around, so asserting hardcoded amounts would
    // race with them. Asserting UI/API consistency stays deterministic under
    // full parallelism and catches real rendering bugs.
    const response = await request.get("/api/accounts");
    expect(response.ok()).toBeTruthy();
    const { accounts } = (await response.json()) as {
      accounts: { name: string; balance: number }[];
    };

    await dashboardPage.goto();
    await expect(dashboardPage.accountCards).toHaveCount(accounts.length);
    for (const account of accounts) {
      await expect(dashboardPage.balanceOf(account.name)).toHaveText(
        formatCurrency(account.balance),
      );
    }
  });

  test("shows the two seeded accounts", async ({ dashboardPage }) => {
    await dashboardPage.goto();

    await expect(
      dashboardPage.accountCard(SEED_ACCOUNTS.checking.name),
    ).toBeVisible();
    await expect(
      dashboardPage.accountCard(SEED_ACCOUNTS.savings.name),
    ).toBeVisible();
  });
});
