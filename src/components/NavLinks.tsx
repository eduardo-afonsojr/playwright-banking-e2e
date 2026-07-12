"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard", testId: "nav-dashboard" },
  { href: "/transfer", label: "Transfer", testId: "nav-transfer" },
  { href: "/history", label: "History", testId: "nav-history" },
] as const;

/** Nav links with the current section highlighted via aria-current. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="nav-links">
      {LINKS.map(({ href, label, testId }) => (
        <Link
          key={href}
          href={href}
          data-testid={testId}
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
