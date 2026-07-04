import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

/** Top navigation shown on authenticated pages. */
export function AppNav({ fullName }: { fullName: string }) {
  return (
    <nav className="nav" data-testid="app-nav">
      <div className="nav-inner">
        <span className="nav-brand">Mini Bank</span>
        <div className="nav-links">
          <Link href="/" data-testid="nav-dashboard">
            Dashboard
          </Link>
          <Link href="/transfer" data-testid="nav-transfer">
            Transfer
          </Link>
          <Link href="/history" data-testid="nav-history">
            History
          </Link>
        </div>
        <span data-testid="nav-user">{fullName}</span>
        <LogoutButton />
      </div>
    </nav>
  );
}
