import type { Locator, Page } from "@playwright/test";

/**
 * Page object for /login.
 *
 * Conventions used by every page object in this suite:
 * - Locators are declared once in the constructor and exposed as readonly
 *   fields, so specs never hardcode selectors.
 * - Methods model user intent ("sign in"), not low-level mechanics.
 * - Assertions live in the specs; page objects only expose state.
 */
export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(readonly page: Page) {
    this.usernameInput = page.getByTestId("login-username");
    this.passwordInput = page.getByTestId("login-password");
    this.submitButton = page.getByTestId("login-submit");
    this.errorMessage = page.getByTestId("login-error");
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  /** Fills the credentials and submits the form. Does not wait for a
   *  navigation: the caller decides whether success or failure is expected. */
  async signIn(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
