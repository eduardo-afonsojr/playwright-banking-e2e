import type { ObjectId } from "mongodb";

export interface UserDocument {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  fullName: string;
  createdAt: Date;
}

export type AccountType = "checking" | "savings";

export interface AccountDocument {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  createdAt: Date;
}

export type TransactionType = "transfer_in" | "transfer_out";

export interface TransactionDocument {
  _id: ObjectId;
  accountId: ObjectId;
  counterpartyAccountId: ObjectId;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: Date;
}

export interface SessionDocument {
  _id: ObjectId;
  token: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
}
