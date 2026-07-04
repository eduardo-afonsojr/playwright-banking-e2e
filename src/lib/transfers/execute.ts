import { ObjectId } from "mongodb";
import {
  accountsCollection,
  transactionsCollection,
} from "@/lib/db/collections";
import { validateTransfer } from "./validation";
import type { AccountDocument } from "@/types/models";

export type TransferResult =
  | {
      ok: true;
      fromAccount: AccountDocument;
      toAccount: AccountDocument;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

/**
 * Validates and executes a transfer between two accounts owned by the user.
 *
 * Note: a standalone MongoDB (no replica set) does not support multi-document
 * transactions, so the balance updates are sequential. Acceptable for a demo
 * app; a production system would use a replica set and a session transaction.
 */
export async function executeTransfer(params: {
  userId: ObjectId;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
}): Promise<TransferResult> {
  const { userId, fromAccountId, toAccountId, amount } = params;

  if (!ObjectId.isValid(fromAccountId) || !ObjectId.isValid(toAccountId)) {
    return {
      ok: false,
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "One of the accounts does not exist.",
    };
  }

  const accounts = await accountsCollection();
  const [fromAccount, toAccount] = await Promise.all([
    accounts.findOne({ _id: new ObjectId(fromAccountId), userId }),
    accounts.findOne({ _id: new ObjectId(toAccountId), userId }),
  ]);

  if (!fromAccount || !toAccount) {
    return {
      ok: false,
      status: 404,
      code: "ACCOUNT_NOT_FOUND",
      message: "One of the accounts does not exist.",
    };
  }

  const validation = validateTransfer({
    fromAccountId,
    toAccountId,
    amount,
    fromBalance: fromAccount.balance,
  });

  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      code: validation.code,
      message: validation.message,
    };
  }

  const createdAt = new Date();

  await accounts.updateOne(
    { _id: fromAccount._id },
    { $inc: { balance: -amount } },
  );
  await accounts.updateOne(
    { _id: toAccount._id },
    { $inc: { balance: amount } },
  );

  const transactions = await transactionsCollection();
  await transactions.insertMany([
    {
      _id: new ObjectId(),
      accountId: fromAccount._id,
      counterpartyAccountId: toAccount._id,
      type: "transfer_out",
      amount,
      description: "Transfer",
      createdAt,
    },
    {
      _id: new ObjectId(),
      accountId: toAccount._id,
      counterpartyAccountId: fromAccount._id,
      type: "transfer_in",
      amount,
      description: "Transfer",
      createdAt,
    },
  ]);

  const [updatedFrom, updatedTo] = await Promise.all([
    accounts.findOne({ _id: fromAccount._id }),
    accounts.findOne({ _id: toAccount._id }),
  ]);

  return {
    ok: true,
    fromAccount: updatedFrom as AccountDocument,
    toAccount: updatedTo as AccountDocument,
  };
}
