import { test, expect } from "../fixtures/test";
import { SEED_ACCOUNTS } from "../fixtures/test-data";
import { formatCurrency } from "../../src/lib/format";
import type { APIRequestContext } from "@playwright/test";

const CHECKING = SEED_ACCOUNTS.checking.name;
const SAVINGS = SEED_ACCOUNTS.savings.name;

// This is the only file whose tests mutate account balances. Running them
// sequentially (other files still run in parallel) keeps the before/after
// balance assertions free of interference without giving up determinism.
test.describe.configure({ mode: "default" });

async function getBalances(
  request: APIRequestContext,
): Promise<Record<string, number>> {
  const response = await request.get("/api/accounts");
  expect(response.ok()).toBeTruthy();
  const { accounts } = (await response.json()) as {
    accounts: { name: string; balance: number }[];
  };
  return Object.fromEntries(accounts.map((a) => [a.name, a.balance]));
}

test.describe("Transfers", () => {
  test("moves money between accounts and updates the balances", async ({
    transferPage,
    request,
  }) => {
    // Balances are read at runtime instead of hardcoding seed values: this
    // is the one spec that mutates data, and relative assertions keep it
    // deterministic no matter how often the suite has already run.
    const before = await getBalances(request);
    const amount = 100;

    await transferPage.goto();
    await transferPage.submitTransfer({
      from: CHECKING,
      to: SAVINGS,
      amount: String(amount),
    });

    await expect(transferPage.successMessage).toHaveText(
      "Transfer completed successfully.",
    );
    // The balances card re-renders in place after the transfer.
    await expect(transferPage.balances).toContainText(
      `${CHECKING}: ${formatCurrency(before[CHECKING] - amount)}`,
    );
    await expect(transferPage.balances).toContainText(
      `${SAVINGS}: ${formatCurrency(before[SAVINGS] + amount)}`,
    );
  });

  test("rejects a transfer with insufficient funds and keeps balances intact", async ({
    transferPage,
    request,
  }) => {
    const before = await getBalances(request);

    await transferPage.goto();
    await transferPage.submitTransfer({
      from: CHECKING,
      to: SAVINGS,
      amount: "999999",
    });

    await expect(transferPage.errorMessage).toHaveText(
      "Insufficient funds in the source account.",
    );

    const after = await getBalances(request);
    expect(after[CHECKING]).toBe(before[CHECKING]);
    expect(after[SAVINGS]).toBe(before[SAVINGS]);
  });

  test("rejects a transfer to the same account", async ({ transferPage }) => {
    await transferPage.goto();
    await transferPage.submitTransfer({
      from: CHECKING,
      to: CHECKING,
      amount: "10",
    });

    await expect(transferPage.errorMessage).toHaveText(
      "Source and destination accounts must be different.",
    );
  });

  test("dashboard shows fresh balances right after a transfer", async ({
    transferPage,
    dashboardPage,
    request,
  }) => {
    // Regression test for a user-reported bug: visiting the dashboard primes
    // the client-side router cache, and navigating back to it right after a
    // transfer served the stale cached balances for up to 30 seconds.
    const before = await getBalances(request);
    const amount = 50;

    // Prime the cache exactly like a real session: dashboard first.
    await dashboardPage.goto();
    await dashboardPage.nav.goToTransfer();

    await transferPage.submitTransfer({
      from: SAVINGS,
      to: CHECKING,
      amount: String(amount),
    });
    await expect(transferPage.successMessage).toBeVisible();

    // Client-side navigation back to the dashboard must show live data.
    await transferPage.nav.goToDashboard();
    await expect(dashboardPage.balanceOf(CHECKING)).toHaveText(
      formatCurrency(before[CHECKING] + amount),
    );
    await expect(dashboardPage.balanceOf(SAVINGS)).toHaveText(
      formatCurrency(before[SAVINGS] - amount),
    );
  });

  test("quick-amount buttons fill the amount from the source balance", async ({
    transferPage,
    request,
  }) => {
    const balances = await getBalances(request);
    const checkingBalance = balances[CHECKING];

    await transferPage.goto();
    await transferPage.fromSelect.selectOption({ label: CHECKING });

    await transferPage.page.getByTestId("transfer-quick-100").click();
    await expect(transferPage.amountInput).toHaveValue(
      checkingBalance.toFixed(2),
    );

    await transferPage.page.getByTestId("transfer-quick-25").click();
    await expect(transferPage.amountInput).toHaveValue(
      (Math.round(checkingBalance * 25) / 100).toFixed(2),
    );
    // No submit: this spec only verifies the input plumbing.
  });

  test("blocks negative amounts through native form validation", async ({
    transferPage,
  }) => {
    // Negative amounts never reach the API from the UI: the input declares
    // min="0", so the browser blocks submission. The API-level rejection is
    // covered by the unit, integration, and Postman layers.
    await transferPage.goto();
    await transferPage.fromSelect.selectOption({ label: CHECKING });
    await transferPage.toSelect.selectOption({ label: SAVINGS });
    await transferPage.amountInput.fill("-5");
    await transferPage.submitButton.click();

    const rangeUnderflow = await transferPage.amountInput.evaluate(
      (input: HTMLInputElement) => input.validity.rangeUnderflow,
    );
    expect(rangeUnderflow).toBe(true);
    // No request was made, so neither outcome message is shown.
    await expect(transferPage.errorMessage).not.toBeVisible();
    await expect(transferPage.successMessage).not.toBeVisible();
  });
});
