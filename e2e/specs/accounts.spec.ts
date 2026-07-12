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

  test("shows the five most recent transactions with a link to the history", async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.goto();

    // The seed alone provides 12 transactions, so the widget is always full.
    const rows = page.getByTestId("recent-activity-row");
    await expect(rows).toHaveCount(5);

    // Rows are newest first (dates in the first column of each row).
    const dates = await rows
      .locator(".activity-meta")
      .allInnerTexts();
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);

    await page.getByTestId("recent-activity-view-all").click();
    await expect(page).toHaveURL(/\/history/);
  });
});
