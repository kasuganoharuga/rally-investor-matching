"use client";

import { Button } from "@/components/ui/button";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";

export function SignOutButton() {
  const { signOut, isSigningOut, error } = useSignOut();

  return (
    <span className="flex items-center gap-2">
      {error ? <span className="text-xs text-destructive">{error.message}</span> : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isSigningOut}
        onClick={() => void signOut()}
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </Button>
    </span>
  );
}
