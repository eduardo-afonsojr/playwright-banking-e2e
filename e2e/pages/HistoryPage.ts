import type { Locator, Page } from "@playwright/test";
import { NavBar } from "./components/NavBar";

/** Page object for /history. */
export class HistoryPage {
  readonly nav: NavBar;
  readonly accountFilter: Locator;
  readonly fromFilter: Locator;
  readonly toFilter: Locator;
  readonly applyButton: Locator;
  readonly rows: Locator;
  readonly emptyState: Locator;
  readonly pageInfo: Locator;
  readonly pageNumber: Locator;
  readonly prevPage: Locator;
  readonly nextPage: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavBar(page);
    this.accountFilter = page.getByTestId("history-filter-account");
    this.fromFilter = page.getByTestId("history-filter-from");
    this.toFilter = page.getByTestId("history-filter-to");
    this.applyButton = page.getByTestId("history-filter-apply");
    this.rows = page.getByTestId("transaction-row");
    this.emptyState = page.getByTestId("history-empty");
    // Prev/Next render as links when actionable and as disabled spans
    // (aria-disabled) on the first/last page, under the same test ids.
    this.pageInfo = page.getByTestId("history-page-info");
    this.pageNumber = page.getByTestId("history-page-number");
    this.prevPage = page.getByTestId("history-prev");
    this.nextPage = page.getByTestId("history-next");
  }

  async goto(): Promise<void> {
    await this.page.goto("/history");
  }

  /**
   * Applies the given filters through the UI form. The form submits as a
   * plain GET, so applying filters triggers a full server-rendered reload
   * with the filters reflected in the URL.
   */
  async applyFilters(filters: {
    account?: string;
    from?: string;
    to?: string;
  }): Promise<void> {
    if (filters.account !== undefined) {
      await this.accountFilter.selectOption({ label: filters.account });
    }
    if (filters.from !== undefined) {
      await this.fromFilter.fill(filters.from);
    }
    if (filters.to !== undefined) {
      await this.toFilter.fill(filters.to);
    }
    await this.applyButton.click();
    await this.page.waitForURL("**/history?*");
  }

  /** Navigates to the next page and waits for the URL to reflect it. */
  async goToNextPage(): Promise<void> {
    await this.nextPage.click();
    await this.page.waitForURL(/[?&]page=/);
  }

  /** Navigates to the previous page and waits for the URL to reflect it. */
  async goToPreviousPage(): Promise<void> {
    await this.prevPage.click();
    await this.page.waitForURL(/[?&]page=/);
  }

  /** The account name shown in a given row (column 2). */
  rowAccountName(row: Locator): Locator {
    return row.locator("td").nth(1);
  }

  /** The transaction date shown in a given row (column 1). */
  rowDate(row: Locator): Locator {
    return row.locator("td").nth(0);
  }
}
