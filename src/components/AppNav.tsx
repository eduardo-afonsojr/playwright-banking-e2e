import { LogoutButton } from "./LogoutButton";
import { BrandMark } from "./BrandMark";
import { NavLinks } from "./NavLinks";

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Top navigation shown on authenticated pages. */
export function AppNav({ fullName }: { fullName: string }) {
  return (
    <nav className="nav" data-testid="app-nav">
      <div className="nav-inner">
        <span className="nav-brand">
          <BrandMark />
          Mini Bank
        </span>
        <NavLinks />
        <span className="nav-user">
          <span className="avatar" aria-hidden="true">
            {initials(fullName)}
          </span>
          <span className="nav-user-name" data-testid="nav-user">
            {fullName}
          </span>
        </span>
        <LogoutButton />
      </div>
    </nav>
  );
}
