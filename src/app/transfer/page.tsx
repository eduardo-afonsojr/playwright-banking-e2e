import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { accountsCollection } from "@/lib/db/collections";
import { toAccountDto } from "@/lib/serialize";
import { AppNav } from "@/components/AppNav";
import { TransferForm } from "@/components/TransferForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Transfer · Mini Bank" };

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
        {/* Balances card + form live in the client component: the transfer
            response carries the new balances, so the whole flow updates
            without another server render. */}
        <TransferForm accounts={userAccounts.map(toAccountDto)} />
      </main>
    </>
  );
}
