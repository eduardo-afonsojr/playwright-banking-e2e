import { test, expect } from "../fixtures/test";

/**
 * Cross-cutting UI concerns: theming, navigation state and page titles.
 * All read-only, fully parallel-safe.
 */

test.describe("Theming", () => {
  test("uses the light theme by default", async ({ page }) => {
    await page.goto("/");
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(background).toBe("rgb(244, 245, 248)");
  });

  test("follows the OS dark-mode preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(background).toBe("rgb(15, 17, 21)");
  });
});

test.describe("Navigation", () => {
  test("highlights the section the user is on", async ({
    page,
    historyPage,
  }) => {
    await historyPage.goto();
    await expect(page.getByTestId("nav-history")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByTestId("nav-dashboard")).not.toHaveAttribute(
      "aria-current",
      "page",
    );

    await historyPage.nav.goToDashboard();
    await expect(page.getByTestId("nav-dashboard")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

test.describe("Page titles", () => {
  test("each page sets its own document title", async ({
    page,
    transferPage,
    historyPage,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Dashboard · Mini Bank");

    await transferPage.goto();
    await expect(page).toHaveTitle("Transfer · Mini Bank");

    await historyPage.goto();
    await expect(page).toHaveTitle("History · Mini Bank");
  });

  test("the login page sets its title for anonymous visitors", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page).toHaveTitle("Sign in · Mini Bank");
    await context.close();
  });
});
