"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavDropdownContent, NavDropdownItem } from "@/components/nav-dropdown";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";
import type { UserRole } from "@/features/auth/types/auth";

type AccountMenuProps = {
  email: string;
  role: UserRole;
};

/**
 * "use client" dropdown holding every account-scoped destination behind
 * one trigger (profile management + sign out). Company Profile is
 * founder-only here for the same reason it's founder-only in
 * SiteHeader's top nav — reviewers/admins have no company to manage.
 */
export function AccountMenu({ email, role }: AccountMenuProps) {
  const { signOut, isSigningOut, error } = useSignOut();

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="hidden text-xs text-destructive sm:inline">
          {error.message}
        </span>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          title={email}
          className="flex items-center gap-1 rounded-full p-0.5 transition hover:bg-muted"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {email.charAt(0).toUpperCase()}
          </span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <NavDropdownContent align="end">
          <NavDropdownItem render={<Link href="/settings" />}>
            My Profile
          </NavDropdownItem>
          {role === "founder" ? (
            <NavDropdownItem render={<Link href="/company-profile" />}>
              Company Profile
            </NavDropdownItem>
          ) : null}
          <NavDropdownItem render={<Link href="/change-password" />}>
            Change password
          </NavDropdownItem>
          <DropdownMenuSeparator />
          <NavDropdownItem
            variant="destructive"
            disabled={isSigningOut}
            onClick={() => void signOut()}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </NavDropdownItem>
        </NavDropdownContent>
      </DropdownMenu>
    </div>
  );
}
