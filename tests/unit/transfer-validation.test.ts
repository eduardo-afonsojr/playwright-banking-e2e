import { validateTransfer } from "@/lib/transfers/validation";

const base = {
  fromAccountId: "account-a",
  toAccountId: "account-b",
  amount: 100,
  fromBalance: 500,
};

describe("validateTransfer", () => {
  it("accepts a valid transfer", () => {
    expect(validateTransfer(base)).toEqual({ ok: true });
  });

  it("accepts a transfer of the entire balance (boundary)", () => {
    expect(validateTransfer({ ...base, amount: 500 })).toEqual({ ok: true });
  });

  it("accepts cent-precision amounts", () => {
    expect(validateTransfer({ ...base, amount: 0.01 })).toEqual({ ok: true });
  });

  describe("invalid amounts", () => {
    it.each([
      ["zero", 0],
      ["negative", -50],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
    ])("rejects %s", (_label, amount) => {
      const result = validateTransfer({ ...base, amount });
      expect(result).toEqual({
        ok: false,
        code: "INVALID_AMOUNT",
        message: "Amount must be a positive number.",
      });
    });

    it("rejects more than two decimal places", () => {
      const result = validateTransfer({ ...base, amount: 10.123 });
      expect(result).toEqual({
        ok: false,
        code: "INVALID_AMOUNT",
        message: "Amount cannot have more than two decimal places.",
      });
    });
  });

  it("rejects a transfer to the same account", () => {
    const result = validateTransfer({
      ...base,
      toAccountId: base.fromAccountId,
    });
    expect(result).toMatchObject({ ok: false, code: "SAME_ACCOUNT" });
  });

  it("rejects a transfer exceeding the balance", () => {
    const result = validateTransfer({ ...base, amount: 500.01 });
    expect(result).toMatchObject({ ok: false, code: "INSUFFICIENT_FUNDS" });
  });

  it("checks the amount before the account pair, and the pair before funds", () => {
    // Documents rule precedence: an invalid amount wins over same-account,
    // and same-account wins over insufficient funds.
    expect(
      validateTransfer({
        ...base,
        toAccountId: base.fromAccountId,
        amount: -1,
      }),
    ).toMatchObject({ code: "INVALID_AMOUNT" });

    expect(
      validateTransfer({
        ...base,
        toAccountId: base.fromAccountId,
        amount: 9999,
      }),
    ).toMatchObject({ code: "SAME_ACCOUNT" });
  });
});
