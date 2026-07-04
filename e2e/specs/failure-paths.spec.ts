import { test, expect } from "../fixtures/test";
import { SEED_USER, SEED_ACCOUNTS } from "../fixtures/test-data";

const CHECKING = SEED_ACCOUNTS.checking.name;
const SAVINGS = SEED_ACCOUNTS.savings.name;

/**
 * Failure-path specs: page.route() intercepts the browser's API calls and
 * simulates infrastructure failures (5xx, dropped connections, latency)
 * that are impractical to produce with a real backend on demand.
 *
 * The question under test is never "does the API fail?" — it is "does the
 * UI degrade gracefully when it does?": a readable error, no fake success,
 * and a form the user can retry.
 *
 * None of these specs reach the real API or touch the database, so they
 * are read-only and fully parallel-safe. (Server-rendered pages fetch data
 * on the server, out of reach of client-side interception — which is why
 * these specs target the two client-side forms.)
 */

test.describe("Login failure paths", () => {
  // Anonymous browser: these specs exercise the login form itself.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows a friendly error when the login API returns 500", async ({
    loginPage,
    page,
  }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Internal Server Error",
      }),
    );

    await loginPage.goto();
    await loginPage.signIn(SEED_USER.username, SEED_USER.password);

    await expect(loginPage.errorMessage).toHaveText(
      "Login failed. Please try again.",
    );
    // The form recovers: the user can correct and retry.
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test("shows a friendly error when the connection drops", async ({
    loginPage,
    page,
  }) => {
    await page.route("**/api/auth/login", (route) =>
      route.abort("connectionfailed"),
    );

    await loginPage.goto();
    await loginPage.signIn(SEED_USER.username, SEED_USER.password);

    await expect(loginPage.errorMessage).toHaveText(
      "Login failed. Please try again.",
    );
    await expect(loginPage.submitButton).toBeEnabled();
  });
});

test.describe("Transfer failure paths", () => {
  test("surfaces the server error message without faking success", async ({
    transferPage,
    page,
  }) => {
    await page.route("**/api/transfers", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error." }),
      }),
    );

    await transferPage.goto();
    await transferPage.submitTransfer({
      from: CHECKING,
      to: SAVINGS,
      amount: "10",
    });

    await expect(transferPage.errorMessage).toHaveText(
      "Internal server error.",
    );
    await expect(transferPage.successMessage).not.toBeVisible();
    await expect(transferPage.submitButton).toBeEnabled();
  });

  test("shows a friendly error when the connection drops", async ({
    transferPage,
    page,
  }) => {
    await page.route("**/api/transfers", (route) =>
      route.abort("connectionfailed"),
    );

    await transferPage.goto();
    await transferPage.submitTransfer({
      from: CHECKING,
      to: SAVINGS,
      amount: "10",
    });

    await expect(transferPage.errorMessage).toHaveText(
      "Transfer failed. Please try again.",
    );
    await expect(transferPage.successMessage).not.toBeVisible();
  });

  test("disables the submit button while the transfer is in flight", async ({
    transferPage,
    page,
  }) => {
    // Delaying the (mocked) response pins the pending UI state down
    // deterministically — no real backend is reliably slow on purpose.
    await page.route("**/api/transfers", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error." }),
      });
    });

    await transferPage.goto();
    await transferPage.submitTransfer({
      from: CHECKING,
      to: SAVINGS,
      amount: "10",
    });

    // While the request is pending: no double submit possible.
    await expect(transferPage.submitButton).toBeDisabled();
    await expect(transferPage.submitButton).toHaveText("Transferring…");

    // After it settles the form is usable again.
    await expect(transferPage.errorMessage).toBeVisible();
    await expect(transferPage.submitButton).toBeEnabled();
    await expect(transferPage.submitButton).toHaveText("Transfer");
  });
});
