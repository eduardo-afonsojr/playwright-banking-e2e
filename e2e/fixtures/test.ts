/**
 * Custom test fixture that injects the page objects, so specs receive them
 * ready-made instead of instantiating them by hand:
 *
 *   test("...", async ({ loginPage, dashboardPage }) => { ... });
 *
 * Extend this file — never import @playwright/test directly in specs.
 */
import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { TransferPage } from "../pages/TransferPage";
import { HistoryPage } from "../pages/HistoryPage";

interface PageObjects {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  transferPage: TransferPage;
  historyPage: HistoryPage;
}

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  transferPage: async ({ page }, use) => {
    await use(new TransferPage(page));
  },
  historyPage: async ({ page }, use) => {
    await use(new HistoryPage(page));
  },
});

export { expect } from "@playwright/test";
