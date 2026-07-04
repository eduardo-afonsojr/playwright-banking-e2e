/**
 * Pure transfer validation rules, deliberately free of any database or
 * framework dependency so they can be unit-tested in isolation.
 */

export type TransferErrorCode =
  | "INVALID_AMOUNT"
  | "SAME_ACCOUNT"
  | "INSUFFICIENT_FUNDS";

export interface TransferValidationInput {
  fromAccountId: string;
  toAccountId: string;
  /** Requested transfer amount in dollars. */
  amount: number;
  /** Current balance of the source account in dollars. */
  fromBalance: number;
}

export type TransferValidationResult =
  | { ok: true }
  | { ok: false; code: TransferErrorCode; message: string };

/** Money is handled with cent precision; more decimals are rejected. */
function hasAtMostTwoDecimals(amount: number): boolean {
  return Math.round(amount * 100) === amount * 100;
}

export function validateTransfer(
  input: TransferValidationInput,
): TransferValidationResult {
  const { fromAccountId, toAccountId, amount, fromBalance } = input;

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "Amount must be a positive number.",
    };
  }

  if (!hasAtMostTwoDecimals(amount)) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "Amount cannot have more than two decimal places.",
    };
  }

  if (fromAccountId === toAccountId) {
    return {
      ok: false,
      code: "SAME_ACCOUNT",
      message: "Source and destination accounts must be different.",
    };
  }

  if (amount > fromBalance) {
    return {
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      message: "Insufficient funds in the source account.",
    };
  }

  return { ok: true };
}
