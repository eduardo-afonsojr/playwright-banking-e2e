import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  accountsCollection,
  transactionsCollection,
} from "@/lib/db/collections";
import { formatCurrency, formatDate } from "@/lib/format";
import { AppNav } from "@/components/AppNav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard · Mini Bank" };

function AccountIcon({ type }: { type: string }) {
  return (
    <span className="account-icon" aria-hidden="true">
      {type === "savings" ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v18" />
          <path d="M17 8a5 5 0 0 0-10 0v8a5 5 0 0 0 10 0" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      )}
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  const accounts = await accountsCollection();
  const userAccounts = await accounts
    .find({ userId: user._id })
    .sort({ name: 1 })
    .toArray();

  const totalBalance = userAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );

  const accountNameById = new Map(
    userAccounts.map((account) => [account._id.toHexString(), account.name]),
  );
  const transactions = await transactionsCollection();
  const recentActivity = await transactions
    .find({ accountId: { $in: userAccounts.map((account) => account._id) } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(5)
    .toArray();

  return (
    <>
      <AppNav fullName={user.fullName} />
      <main>
        <h1>Your accounts</h1>
        <p className="page-subtitle">
          Welcome back, {user.fullName.split(" ")[0]}. Here is an overview of
          your money.
        </p>

        <div className="hero-card" data-testid="total-balance">
          <div className="hero-label">Total balance</div>
          <div className="hero-amount">{formatCurrency(totalBalance)}</div>
          <div className="hero-meta">
            Across {userAccounts.length} accounts · USD
          </div>
        </div>

        <div className="account-list" data-testid="account-list">
          {userAccounts.map((account) => (
            <div
              key={account._id.toHexString()}
              className="card account-card"
              data-testid="account-card"
              data-account-name={account.name}
            >
              <div className="account-head">
                <AccountIcon type={account.type} />
                <div>
                  <div className="account-name">{account.name}</div>
                  <span className="account-type">{account.type}</span>
                </div>
              </div>
              <div className="account-balance-label">Available balance</div>
              <div className="account-balance" data-testid="account-balance">
                {formatCurrency(account.balance)}
              </div>
            </div>
          ))}
        </div>

        <div className="section-header">
          <h2>Recent activity</h2>
          <Link
            className="view-all"
            href="/history"
            data-testid="recent-activity-view-all"
          >
            View all
          </Link>
        </div>
        <ul className="activity-list" data-testid="recent-activity">
          {recentActivity.map((transaction) => {
            const isIncoming = transaction.type === "transfer_in";
            const accountName = accountNameById.get(
              transaction.accountId.toHexString(),
            );
            const counterparty = accountNameById.get(
              transaction.counterpartyAccountId.toHexString(),
            );
            return (
              <li
                key={transaction._id.toHexString()}
                className="activity-row"
                data-testid="recent-activity-row"
              >
                <span
                  className={`activity-icon ${isIncoming ? "in" : "out"}`}
                  aria-hidden="true"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {isIncoming ? (
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    ) : (
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    )}
                  </svg>
                </span>
                <span className="activity-main">
                  <span className="activity-title">
                    {isIncoming
                      ? `${accountName}: received from ${counterparty}`
                      : `${accountName}: sent to ${counterparty}`}
                  </span>
                  <br />
                  <span className="activity-meta">
                    {formatDate(transaction.createdAt)}
                  </span>
                </span>
                <span className={isIncoming ? "amount-in" : "amount-out"}>
                  {isIncoming ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
