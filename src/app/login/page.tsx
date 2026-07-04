import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";
import { BrandMark } from "@/components/BrandMark";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <BrandMark />
          Mini Bank
        </div>
        <div className="login-card">
          <h1>Welcome back</h1>
          <p className="login-hint">
            Demo credentials: <code>jane.doe</code> / <code>Password123!</code>
          </p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
