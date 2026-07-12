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

test.describe("Loading states", () => {
  test("streams a skeleton while a slow navigation loads", async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();

    // Delay only the React Server Component payload of the history page:
    // locally the round trip is too fast to ever observe the skeleton, so
    // the test manufactures the latency it needs to pin the state down.
    await page.route("**/history*", async (route) => {
      if (route.request().headers()["rsc"]) {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      await route.continue();
    });

    await dashboardPage.nav.goToHistory();
    await expect(page.getByTestId("page-loading")).toBeVisible();

    // The real content replaces the skeleton once the payload arrives.
    await expect(page.getByTestId("history-table")).toBeVisible();
    await expect(page.getByTestId("page-loading")).not.toBeVisible();
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
