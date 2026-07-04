import { NextResponse } from "next/server";
import { accountsCollection } from "@/lib/db/collections";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { toAccountDto } from "@/lib/serialize";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const accounts = await accountsCollection();
  const userAccounts = await accounts
    .find({ userId: user._id })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json({ accounts: userAccounts.map(toAccountDto) });
}
