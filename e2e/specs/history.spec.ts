import { test, expect } from "../fixtures/test";
import { SEED_ACCOUNTS, SEED_TRANSFERS } from "../fixtures/test-data";
import { TRANSACTIONS_PAGE_SIZE } from "../../src/lib/pagination";

const CHECKING = SEED_ACCOUNTS.checking.name;
const SAVINGS = SEED_ACCOUNTS.savings.name;

/** YYYY-MM-DD for `days` days ago, in UTC (matches how dates render). */
function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

test.describe("Transaction history", () => {
  test("shows the first page of history by default", async ({
    historyPage,
  }) => {
    await historyPage.goto();

    // The seed alone (12 entries) overflows one page, so page 1 always
    // holds exactly one page worth of rows — no matter how many extra
    // transactions concurrent specs have created.
    await expect(historyPage.rows).toHaveCount(TRANSACTIONS_PAGE_SIZE);
    await expect(historyPage.pageInfo).toHaveText(
      new RegExp(`Showing 1–${TRANSACTIONS_PAGE_SIZE} of \\d+`),
    );
    await expect(historyPage.pageNumber).toContainText("Page 1");
    await expect(historyPage.prevPage).toHaveAttribute("aria-disabled", "true");
    // More than one page exists, so Next must be an actionable link.
    await expect(historyPage.nextPage).not.toHaveAttribute("aria-disabled");
  });

  test("navigates between pages, keeping row order stable", async ({
    historyPage,
  }) => {
    await historyPage.goto();
    const firstPageDates = await historyPage.rows.evaluateAll((rows) =>
      rows.map((row) => (row as HTMLTableRowElement).cells[0].innerText),
    );

    await historyPage.goToNextPage();
    await expect(historyPage.page).toHaveURL(/[?&]page=2/);
    await expect(historyPage.pageNumber).toContainText("Page 2");
    await expect(historyPage.nextPage).toHaveAttribute("aria-disabled", "true");

    // Page 2 holds the seeded overflow (2 rows) plus anything concurrent
    // specs added — never more than a full page.
    const secondPageCount = await historyPage.rows.count();
    expect(secondPageCount).toBeGreaterThanOrEqual(2);
    expect(secondPageCount).toBeLessThanOrEqual(TRANSACTIONS_PAGE_SIZE);

    // Newest-first order continues across the boundary: everything on
    // page 2 is at most as recent as the last row of page 1.
    const secondPageDates = await historyPage.rows.evaluateAll((rows) =>
      rows.map((row) => (row as HTMLTableRowElement).cells[0].innerText),
    );
    const lastOfFirstPage = firstPageDates[firstPageDates.length - 1];
    for (const date of secondPageDates) {
      expect(date <= lastOfFirstPage).toBe(true);
    }

    await historyPage.goToPreviousPage();
    await expect(historyPage.pageNumber).toContainText("Page 1");
    await expect(historyPage.rows).toHaveCount(TRANSACTIONS_PAGE_SIZE);
  });

  test("disables pagination when everything fits one page", async ({
    historyPage,
  }) => {
    await historyPage.goto();
    await historyPage.applyFilters({ account: SAVINGS });

    await expect(historyPage.pageNumber).toContainText("Page 1 of 1");
    await expect(historyPage.prevPage).toHaveAttribute("aria-disabled", "true");
    await expect(historyPage.nextPage).toHaveAttribute("aria-disabled", "true");
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
