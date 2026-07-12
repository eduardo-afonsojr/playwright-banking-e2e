/**
 * @jest-environment jsdom
 *
 * Component test for the TransferForm quick-amount buttons: the derived
 * values must track the selected source account's balance.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { TransferForm } from "@/components/TransferForm";

const ACCOUNTS = [
  { id: "a1", name: "Checking", type: "checking", currency: "USD", balance: 2500 },
  { id: "a2", name: "Savings", type: "savings", currency: "USD", balance: 10000.5 },
];

describe("TransferForm quick amounts", () => {
  it("fills the amount with the source account balance on Max", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={ACCOUNTS} />);

    await user.click(screen.getByRole("button", { name: "Max" }));

    expect(screen.getByLabelText("Amount (USD)")).toHaveValue(2500);
  });

  it("computes percentages with cent precision", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={ACCOUNTS} />);

    await user.click(screen.getByRole("button", { name: "25%" }));
    expect(screen.getByLabelText("Amount (USD)")).toHaveValue(625);

    await user.click(screen.getByRole("button", { name: "50%" }));
    expect(screen.getByLabelText("Amount (USD)")).toHaveValue(1250);
  });

  it("recomputes from the newly selected source account", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={ACCOUNTS} />);

    await user.selectOptions(screen.getByLabelText("From"), "a2");
    await user.click(screen.getByRole("button", { name: "50%" }));

    // 50% of 10000.50 is 5000.25: the rounding path with real cents.
    expect(screen.getByLabelText("Amount (USD)")).toHaveValue(5000.25);
  });
});

describe("TransferForm balances", () => {
  it("updates the balances card from the transfer response", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        fromAccount: { ...ACCOUNTS[0], balance: 2400 },
        toAccount: { ...ACCOUNTS[1], balance: 10100.5 },
      }),
    }) as unknown as typeof fetch;
    render(<TransferForm accounts={ACCOUNTS} />);

    await user.type(screen.getByLabelText("Amount (USD)"), "100");
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(
      await screen.findByText("Transfer completed successfully."),
    ).toBeInTheDocument();
    // The card reflects the authoritative balances from the API response,
    // with no page refresh involved.
    expect(screen.getByTestId("transfer-balances")).toHaveTextContent(
      "Checking: $2,400.00",
    );
    expect(screen.getByTestId("transfer-balances")).toHaveTextContent(
      "Savings: $10,100.50",
    );
  });
});
