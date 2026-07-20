import Image from "next/image";
import Link from "next/link";

import { AccountMenu } from "@/features/auth/components/account-menu";
import type { UserRole } from "@/features/auth/types/auth";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavDropdownContent, NavDropdownItem } from "@/components/nav-dropdown";
import { ChevronDownIcon } from "lucide-react";

type SiteHeaderSection =
  | "investors"
  | "match"
  | "user-management"
  | "manage-investors"
  | "manage-companies"
  | "company-profile"
  | "settings"
  | "change-password"
  | "shortlist";

type NavLink = {
  section: SiteHeaderSection;
  href: string;
  label: string;
};

const NAV_LINKS: readonly NavLink[] = [
  { section: "match", href: "/match", label: "Workspace" },
  { section: "investors", href: "/investors", label: "Investors" },
];

/**
 * Admin/reviewer-only nav group. Grouped under one "Management" dropdown
 * instead of separate top-level links so future admin sub-areas (investor
 * data, company data) don't crowd the primary nav.
 */
const MANAGEMENT_LINKS: readonly NavLink[] = [
  {
    section: "user-management",
    href: "/admin/invitations",
    label: "User Management",
  },
  {
    section: "manage-investors",
    href: "/admin/investors",
    label: "Manage Investors",
  },
  {
    section: "manage-companies",
    href: "/admin/companies",
    label: "Manage Companies",
  },
];
const MANAGEMENT_ROLES: readonly UserRole[] = ["admin", "reviewer"];

type SiteHeaderProps = {
  active: SiteHeaderSection;
  user: { email: string; role: UserRole };
};

/**
 * Shared nav bar for every signed-in page (investors directory, match
 * workspace, admin management pages). Centralizing it here means the
 * "Management" dropdown and its role gate only need to be written once.
 */
export function SiteHeader({ active, user }: SiteHeaderProps) {
  const showManagement = MANAGEMENT_ROLES.includes(user.role);
  const isManagementActive = MANAGEMENT_LINKS.some((link) => link.section === active);

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4">
        <nav className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/rally-icon.png"
              alt="Rally"
              width={34}
              height={34}
              priority
              className="size-8 rounded-md object-cover"
            />
            <span className="text-sm font-bold tracking-wide text-foreground">
              RALLY
            </span>
          </Link>
          {NAV_LINKS.map((link) =>
            link.section === active ? (
              <span
                key={link.section}
                aria-current="page"
                className="border-b-2 border-primary py-5 text-sm font-semibold text-foreground"
              >
                {link.label}
              </span>
            ) : (
              <Link
                key={link.section}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
          {showManagement ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={
                  isManagementActive
                    ? "flex items-center gap-1 border-b-2 border-primary py-5 text-sm font-semibold text-foreground"
                    : "flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                }
              >
                Management
                <ChevronDownIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <NavDropdownContent align="start">
                {MANAGEMENT_LINKS.map((link) => (
                  <NavDropdownItem
                    key={link.section}
                    render={<Link href={link.href} />}
                    data-active={link.section === active || undefined}
                    className="data-active:font-semibold data-active:text-foreground"
                  >
                    {link.label}
                  </NavDropdownItem>
                ))}
              </NavDropdownContent>
            </DropdownMenu>
          ) : null}
        </nav>
        <AccountMenu email={user.email} role={user.role} />
      </div>
    </header>
  );
}
