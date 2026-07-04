import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { accountsCollection } from "@/lib/db/collections";
import { formatCurrency } from "@/lib/format";
import { toAccountDto } from "@/lib/serialize";
import { AppNav } from "@/components/AppNav";
import { TransferForm } from "@/components/TransferForm";

export const dynamic = "force-dynamic";

export default async function TransferPage() {
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
        <h1>Transfer money</h1>
        <p className="page-subtitle">
          Move money between your accounts instantly.
        </p>

        <div className="card">
          <h2>Current balances</h2>
          {/* Text stays "Name: $amount" because the E2E specs assert it. */}
          <ul className="balance-strip" data-testid="transfer-balances">
            {userAccounts.map((account) => (
              <li key={account._id.toHexString()}>
                {account.name}:{" "}
                <strong>{formatCurrency(account.balance)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <TransferForm accounts={userAccounts.map(toAccountDto)} />
        </div>
      </main>
    </>
  );
}
