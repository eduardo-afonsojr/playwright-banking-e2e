import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId, type Filter } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  accountsCollection,
  transactionsCollection,
} from "@/lib/db/collections";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTIONS_PAGE_SIZE } from "@/lib/pagination";
import { AppNav } from "@/components/AppNav";
import type { TransactionDocument } from "@/types/models";

export const dynamic = "force-dynamic";

interface HistorySearchParams {
  accountId?: string;
  from?: string;
  to?: string;
  page?: string;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: HistorySearchParams;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const accounts = await accountsCollection();
  const userAccounts = await accounts
    .find({ userId: user._id })
    .sort({ name: 1 })
    .toArray();
  const accountNameById = new Map(
    userAccounts.map((account) => [account._id.toHexString(), account.name]),
  );

  const { accountId, from, to, page: pageParam } = searchParams;

  let accountFilter = userAccounts.map((account) => account._id);
  if (accountId && ObjectId.isValid(accountId)) {
    const requestedId = new ObjectId(accountId);
    if (accountFilter.some((id) => id.equals(requestedId))) {
      accountFilter = [requestedId];
    }
  }

  const filter: Filter<TransactionDocument> = {
    accountId: { $in: accountFilter },
  };
  const createdAt: { $gte?: Date; $lte?: Date } = {};
  if (from) {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(fromDate.getTime())) {
      createdAt.$gte = fromDate;
    }
  }
  if (to) {
    const toDate = new Date(`${to}T23:59:59.999Z`);
    if (!Number.isNaN(toDate.getTime())) {
      createdAt.$lte = toDate;
    }
  }
  if (createdAt.$gte || createdAt.$lte) {
    filter.createdAt = createdAt;
  }

  const transactions = await transactionsCollection();
  const totalCount = await transactions.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / TRANSACTIONS_PAGE_SIZE));

  // The UI clamps out-of-range pages instead of erroring: a stale or
  // hand-edited URL should still land somewhere sensible.
  const requestedPage = Number(pageParam);
  const page = Number.isInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  // Secondary sort on _id: debit/credit pairs share the same createdAt, and
  // pagination needs a total order to not repeat or skip rows across pages.
  const results = await transactions
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * TRANSACTIONS_PAGE_SIZE)
    .limit(TRANSACTIONS_PAGE_SIZE)
    .toArray();

  const showingFrom = (page - 1) * TRANSACTIONS_PAGE_SIZE + 1;
  const showingTo = Math.min(page * TRANSACTIONS_PAGE_SIZE, totalCount);

  // Prev/Next links preserve the active filters.
  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(target));
    return `/history?${params.toString()}`;
  }

  return (
    <>
      <AppNav fullName={user.fullName} />
      <main>
        <h1>Transaction history</h1>
        <p className="page-subtitle">
          Every movement across your accounts, newest first.
        </p>

        {/* Plain GET form: filters land in the URL, so filtered views are
            linkable and the page stays fully server-rendered. */}
        <form className="filters" data-testid="history-filters">
          <div className="form-field">
            <label htmlFor="filter-account">Account</label>
            <select
              id="filter-account"
              name="accountId"
              data-testid="history-filter-account"
              defaultValue={accountId ?? ""}
            >
              <option value="">All accounts</option>
              {userAccounts.map((account) => (
                <option
                  key={account._id.toHexString()}
                  value={account._id.toHexString()}
                >
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="filter-from">From</label>
            <input
              id="filter-from"
              name="from"
              type="date"
              data-testid="history-filter-from"
              defaultValue={from ?? ""}
            />
          </div>
          <div className="form-field">
            <label htmlFor="filter-to">To</label>
            <input
              id="filter-to"
              name="to"
              type="date"
              data-testid="history-filter-to"
              defaultValue={to ?? ""}
            />
          </div>
          <button type="submit" data-testid="history-filter-apply">
            Apply filters
          </button>
        </form>

        {results.length === 0 ? (
          <div className="card empty-state" data-testid="history-empty">
            No transactions match the current filters.
          </div>
        ) : (
          <div className="table-card">
            <table data-testid="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Description</th>
                <th>Counterparty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {results.map((transaction) => {
                const isIncoming = transaction.type === "transfer_in";
                return (
                  <tr
                    key={transaction._id.toHexString()}
                    data-testid="transaction-row"
                    data-transaction-type={transaction.type}
                  >
                    <td>{formatDate(transaction.createdAt)}</td>
                    <td>
                      {accountNameById.get(
                        transaction.accountId.toHexString(),
                      )}
                    </td>
                    <td>{transaction.description}</td>
                    <td>
                      {accountNameById.get(
                        transaction.counterpartyAccountId.toHexString(),
                      )}
                    </td>
                    <td className={isIncoming ? "amount-in" : "amount-out"}>
                      {isIncoming ? "+" : "−"}
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
            <div className="pagination" data-testid="history-pagination">
              <span data-testid="history-page-info">
                Showing {showingFrom}–{showingTo} of {totalCount}
              </span>
              <span className="pagination-controls">
                {page > 1 ? (
                  <Link
                    className="page-link"
                    data-testid="history-prev"
                    href={pageHref(page - 1)}
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span
                    className="page-link disabled"
                    data-testid="history-prev"
                    aria-disabled="true"
                  >
                    ← Previous
                  </span>
                )}
                <span className="page-current" data-testid="history-page-number">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    className="page-link"
                    data-testid="history-next"
                    href={pageHref(page + 1)}
                  >
                    Next →
                  </Link>
                ) : (
                  <span
                    className="page-link disabled"
                    data-testid="history-next"
                    aria-disabled="true"
                  >
                    Next →
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
