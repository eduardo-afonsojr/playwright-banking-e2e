import type { Locator, Page } from "@playwright/test";
import { NavBar } from "./components/NavBar";

/** Page object for the accounts dashboard (/). */
export class DashboardPage {
  readonly nav: NavBar;
  readonly heading: Locator;
  readonly accountCards: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavBar(page);
    this.heading = page.getByRole("heading", { name: "Your accounts" });
    this.accountCards = page.getByTestId("account-card");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  /** The card for a single account, addressed by its display name. */
  accountCard(accountName: string): Locator {
    return this.page.locator(
      `[data-testid="account-card"][data-account-name="${accountName}"]`,
    );
  }

  /** The formatted balance text (e.g. "$2,500.00") of a single account. */
  balanceOf(accountName: string): Locator {
    return this.accountCard(accountName).getByTestId("account-balance");
  }
}
