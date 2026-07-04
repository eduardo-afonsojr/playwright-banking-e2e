import { NextResponse } from "next/server";
import { ObjectId, type Filter } from "mongodb";
import {
  accountsCollection,
  transactionsCollection,
} from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { toTransactionDto } from "@/lib/serialize";
import { TRANSACTIONS_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/pagination";
import type { TransactionDocument } from "@/types/models";

/**
 * GET /api/transactions?accountId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=10
 *
 * Returns one page of the user's transactions, newest first, plus
 * pagination metadata. All parameters are optional:
 * - accountId: restrict to a single account (must belong to the user)
 * - from / to: inclusive date range on the transaction date
 * - page: 1-based page number (default 1); a page past the end returns
 *   an empty list with the metadata intact
 * - pageSize: items per page (default 10, max 100)
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

  const pageParam = searchParams.get("page");
  const page = pageParam === null ? 1 : Number(pageParam);
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json(
      { error: "page must be a positive integer." },
      { status: 400 },
    );
  }

  const pageSizeParam = searchParams.get("pageSize");
  const pageSize =
    pageSizeParam === null ? TRANSACTIONS_PAGE_SIZE : Number(pageSizeParam);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return NextResponse.json(
      { error: `pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}.` },
      { status: 400 },
    );
  }

  const transactions = await transactionsCollection();
  const totalCount = await transactions.countDocuments(filter);
  // Secondary sort on _id: transfers create debit/credit pairs sharing the
  // same createdAt, and without a total order documents could repeat or go
  // missing across page boundaries.
  const results = await transactions
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return NextResponse.json({
    transactions: results.map(toTransactionDto),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
}
