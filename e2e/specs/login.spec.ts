import { test, expect } from "../fixtures/test";
import { SEED_USER } from "../fixtures/test-data";

// Login specs must start anonymous, so they opt out of the authenticated
// storage state that the rest of the suite inherits from the setup project.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login", () => {
  test("signs in with valid credentials and lands on the dashboard", async ({
    loginPage,
    dashboardPage,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.signIn(SEED_USER.username, SEED_USER.password);

    await expect(page).toHaveURL("/");
    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.nav.userName).toHaveText(SEED_USER.fullName);
  });

  test("shows an error message for invalid credentials", async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.signIn(SEED_USER.username, "definitely-wrong-password");

    await expect(loginPage.errorMessage).toHaveText(
      "Invalid username or password.",
    );
    // Still on the login page, with the form ready for another attempt.
    await expect(page).toHaveURL(/\/login$/);
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test("redirects anonymous visitors to the login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
