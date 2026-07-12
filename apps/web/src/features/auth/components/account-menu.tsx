"use client";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <span className="hidden sm:inline">{email}</span>
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {role === "founder" ? (
            <DropdownMenuItem render={<Link href="/company-profile" />}>
              Company Profile
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem render={<Link href="/settings" />}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/change-password" />}>
            Change password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={isSigningOut} onClick={() => void signOut()}>
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
