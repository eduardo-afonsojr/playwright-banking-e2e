import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { accountsCollection } from "@/lib/db/collections";
import { formatCurrency } from "@/lib/format";
import { AppNav } from "@/components/AppNav";

export const dynamic = "force-dynamic";

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

  return (
    <>
      <AppNav fullName={user.fullName} />
      <main>
        <h1>Your accounts</h1>
        <div className="account-list" data-testid="account-list">
          {userAccounts.map((account) => (
            <div
              key={account._id.toHexString()}
              className="card"
              data-testid="account-card"
              data-account-name={account.name}
            >
              <div className="account-name">{account.name}</div>
              <div className="account-type">{account.type}</div>
              <div className="account-balance" data-testid="account-balance">
                {formatCurrency(account.balance)}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
