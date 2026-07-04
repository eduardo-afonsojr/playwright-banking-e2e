import type { Locator, Page } from "@playwright/test";
import { NavBar } from "./components/NavBar";

/** Page object for /transfer. */
export class TransferPage {
  readonly nav: NavBar;
  readonly fromSelect: Locator;
  readonly toSelect: Locator;
  readonly amountInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly balances: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavBar(page);
    this.fromSelect = page.getByTestId("transfer-from");
    this.toSelect = page.getByTestId("transfer-to");
    this.amountInput = page.getByTestId("transfer-amount");
    this.submitButton = page.getByTestId("transfer-submit");
    this.successMessage = page.getByTestId("transfer-success");
    this.errorMessage = page.getByTestId("transfer-error");
    this.balances = page.getByTestId("transfer-balances");
  }

  async goto(): Promise<void> {
    await this.page.goto("/transfer");
  }

  /**
   * Fills and submits the transfer form. Accounts are selected by their
   * visible name (option label), mirroring what a real user sees.
   * Amount is passed as a string so specs can also exercise edge inputs.
   */
  async submitTransfer(options: {
    from: string;
    to: string;
    amount: string;
  }): Promise<void> {
    await this.fromSelect.selectOption({ label: options.from });
    await this.toSelect.selectOption({ label: options.to });
    await this.amountInput.fill(options.amount);
    await this.submitButton.click();
  }
}
