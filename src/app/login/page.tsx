import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/");
  }

  return (
    <main>
      <h1>Sign in to Mini Bank</h1>
      <div className="card">
        <LoginForm />
      </div>
    </main>
  );
}
