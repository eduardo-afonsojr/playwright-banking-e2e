import { NextResponse } from "next/server";
import { ObjectId, type Filter } from "mongodb";
import {
  accountsCollection,
  transactionsCollection,
} from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { toTransactionDto } from "@/lib/serialize";
import type { TransactionDocument } from "@/types/models";

/**
 * GET /api/transactions?accountId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns the user's transactions, newest first. All filters are optional:
 * - accountId: restrict to a single account (must belong to the user)
 * - from / to: inclusive date range on the transaction date
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const accountIdParam = searchParams.get("accountId");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const accounts = await accountsCollection();
  const userAccounts = await accounts.find({ userId: user._id }).toArray();
  const userAccountIds = userAccounts.map((account) => account._id);

  let accountFilter = userAccountIds;
  if (accountIdParam) {
    if (!ObjectId.isValid(accountIdParam)) {
      return NextResponse.json(
        { error: "accountId is not a valid id." },
        { status: 400 },
      );
    }
    const requestedId = new ObjectId(accountIdParam);
    const ownsAccount = userAccountIds.some((id) => id.equals(requestedId));
    if (!ownsAccount) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }
    accountFilter = [requestedId];
  }

  const filter: Filter<TransactionDocument> = {
    accountId: { $in: accountFilter },
  };

  const createdAt: { $gte?: Date; $lte?: Date } = {};
  if (fromParam) {
    const from = new Date(`${fromParam}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime())) {
      return NextResponse.json(
        { error: "from must be a valid date (YYYY-MM-DD)." },
        { status: 400 },
      );
    }
    createdAt.$gte = from;
  }
  if (toParam) {
    const to = new Date(`${toParam}T23:59:59.999Z`);
    if (Number.isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "to must be a valid date (YYYY-MM-DD)." },
        { status: 400 },
      );
    }
    createdAt.$lte = to;
  }
  if (createdAt.$gte || createdAt.$lte) {
    filter.createdAt = createdAt;
  }

  const transactions = await transactionsCollection();
  const results = await transactions
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    transactions: results.map(toTransactionDto),
  });
}
