import type { Locator, Page } from "@playwright/test";

/**
 * Component object for the top navigation shown on every authenticated page.
 * Modeled separately from the page objects so each of them can compose it
 * instead of redeclaring the same locators.
 */
export class NavBar {
  readonly root: Locator;
  readonly userName: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId("app-nav");
    this.userName = page.getByTestId("nav-user");
  }

  async goToDashboard(): Promise<void> {
    await this.page.getByTestId("nav-dashboard").click();
  }

  async goToTransfer(): Promise<void> {
    await this.page.getByTestId("nav-transfer").click();
  }

  async goToHistory(): Promise<void> {
    await this.page.getByTestId("nav-history").click();
  }

  async logout(): Promise<void> {
    await this.page.getByTestId("nav-logout").click();
    await this.page.waitForURL("**/login");
  }
}
