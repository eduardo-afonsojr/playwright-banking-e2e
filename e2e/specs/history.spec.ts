import { test, expect } from "../fixtures/test";
import { SEED_ACCOUNTS, SEED_TRANSFERS } from "../fixtures/test-data";

const CHECKING = SEED_ACCOUNTS.checking.name;
const SAVINGS = SEED_ACCOUNTS.savings.name;

/** YYYY-MM-DD for `days` days ago, in UTC (matches how dates render). */
function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

test.describe("Transaction history", () => {
  test("shows the seeded history by default", async ({ historyPage }) => {
    await historyPage.goto();

    // Other specs legitimately add transactions while the suite runs, so the
    // assertion is a lower bound: everything the seed created must be there.
    await expect(historyPage.rows).not.toHaveCount(0);
    const rowCount = await historyPage.rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(SEED_TRANSFERS.length * 2);
  });

  test("filters by account", async ({ historyPage }) => {
    await historyPage.goto();
    await historyPage.applyFilters({ account: SAVINGS });

    // Filter state survives the reload and lands in the URL (linkable).
    await expect(historyPage.page).toHaveURL(/accountId=/);

    const rows = await historyPage.rows.all();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      await expect(historyPage.rowAccountName(row)).toHaveText(SAVINGS);
    }
  });

  test("filters by date range", async ({ historyPage }) => {
    // The range [30 days ago, yesterday] deliberately excludes "today":
    // concurrent transfer specs create transactions dated now, so this
    // window is stable while still spanning several seeded transfers.
    const from = isoDaysAgo(30);
    const to = isoDaysAgo(1);

    await historyPage.goto();
    await historyPage.applyFilters({ from, to });

    const expected = SEED_TRANSFERS.filter(
      (transfer) => transfer.daysAgo <= 30 && transfer.daysAgo >= 1,
    ).length;
    await expect(historyPage.rows).toHaveCount(expected * 2);

    for (const row of await historyPage.rows.all()) {
      const date = await historyPage.rowDate(row).innerText();
      expect(date >= from && date <= to).toBe(true);
    }
  });

  test("combines account and date filters", async ({ historyPage }) => {
    const from = isoDaysAgo(30);
    const to = isoDaysAgo(1);

    await historyPage.goto();
    await historyPage.applyFilters({ account: CHECKING, from, to });

    const expected = SEED_TRANSFERS.filter(
      (transfer) => transfer.daysAgo <= 30 && transfer.daysAgo >= 1,
    ).length;
    // Every transfer touches both accounts (one debit, one credit), so a
    // single-account view shows exactly one row per transfer in range.
    await expect(historyPage.rows).toHaveCount(expected);
    for (const row of await historyPage.rows.all()) {
      await expect(historyPage.rowAccountName(row)).toHaveText(CHECKING);
    }
  });

  test("shows an empty state when no transactions match", async ({
    historyPage,
  }) => {
    await historyPage.goto();
    await historyPage.applyFilters({
      from: isoDaysAgo(365),
      to: isoDaysAgo(300),
    });

    await expect(historyPage.emptyState).toBeVisible();
    await expect(historyPage.rows).toHaveCount(0);
  });
});
