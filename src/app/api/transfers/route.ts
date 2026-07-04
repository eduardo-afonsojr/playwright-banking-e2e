import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { executeTransfer } from "@/lib/transfers/execute";
import { toAccountDto } from "@/lib/serialize";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let body: {
    fromAccountId?: unknown;
    toAccountId?: unknown;
    amount?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const { fromAccountId, toAccountId, amount } = body;
  if (
    typeof fromAccountId !== "string" ||
    typeof toAccountId !== "string" ||
    typeof amount !== "number"
  ) {
    return NextResponse.json(
      {
        error:
          "fromAccountId (string), toAccountId (string) and amount (number) are required.",
      },
      { status: 400 },
    );
  }

  const result = await executeTransfer({
    userId: user._id,
    fromAccountId,
    toAccountId,
    amount,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      fromAccount: toAccountDto(result.fromAccount),
      toAccount: toAccountDto(result.toAccount),
    },
    { status: 201 },
  );
}
