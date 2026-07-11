import Image from "next/image";
import Link from "next/link";

import { AccountMenu } from "@/features/auth/components/account-menu";
import type { UserRole } from "@/features/auth/types/auth";

type SiteHeaderSection =
  "investors" | "match" | "invitations" | "company-profile" | "settings";

type NavLink = {
  section: SiteHeaderSection;
  href: string;
  label: string;
  roles?: readonly UserRole[];
};

const NAV_LINKS: readonly NavLink[] = [
  { section: "match", href: "/match", label: "Workspace" },
  { section: "investors", href: "/investors", label: "Investors" },
  {
    section: "invitations",
    href: "/admin/invitations",
    label: "Invitations",
    roles: ["admin", "reviewer"],
  },
  {
    section: "company-profile",
    href: "/company-profile",
    label: "Company Profile",
    roles: ["founder"],
  },
  { section: "settings", href: "/settings", label: "Settings" },
];

type SiteHeaderProps = {
  active: SiteHeaderSection;
  user: { email: string; role: UserRole };
};

/**
 * Shared nav bar for every signed-in page (investors directory, match
 * workspace, admin invitations). Centralizing it here means the
 * "Invitations" link and its role gate only need to be written once.
 */
export function SiteHeader({ active, user }: SiteHeaderProps) {
  const visibleLinks = NAV_LINKS.filter(
    (link) => !link.roles || link.roles.includes(user.role),
  );

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-4">
        <nav className="flex items-center gap-8">
          <Link href="/investors" className="flex items-center gap-2">
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
          {visibleLinks.map((link) =>
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
        </nav>
        <AccountMenu email={user.email} role={user.role} />
      </div>
    </header>
  );
}
