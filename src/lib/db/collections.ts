import type { Collection } from "mongodb";
import { getDb } from "./mongodb";
import type {
  AccountDocument,
  SessionDocument,
  TransactionDocument,
  UserDocument,
} from "@/types/models";

export async function usersCollection(): Promise<Collection<UserDocument>> {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export async function accountsCollection(): Promise<
  Collection<AccountDocument>
> {
  const db = await getDb();
  return db.collection<AccountDocument>("accounts");
}

export async function transactionsCollection(): Promise<
  Collection<TransactionDocument>
> {
  const db = await getDb();
  return db.collection<TransactionDocument>("transactions");
}

export async function sessionsCollection(): Promise<
  Collection<SessionDocument>
> {
  const db = await getDb();
  return db.collection<SessionDocument>("sessions");
}
