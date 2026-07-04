import type { AccountDocument, TransactionDocument } from "@/types/models";

/** JSON-friendly shapes returned by the API routes. */

export interface AccountDto {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
}

export interface TransactionDto {
  id: string;
  accountId: string;
  counterpartyAccountId: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export function toAccountDto(account: AccountDocument): AccountDto {
  return {
    id: account._id.toHexString(),
    name: account.name,
    type: account.type,
    currency: account.currency,
    balance: account.balance,
  };
}

export function toTransactionDto(
  transaction: TransactionDocument,
): TransactionDto {
  return {
    id: transaction._id.toHexString(),
    accountId: transaction.accountId.toHexString(),
    counterpartyAccountId: transaction.counterpartyAccountId.toHexString(),
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    createdAt: transaction.createdAt.toISOString(),
  };
}
