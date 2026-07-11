import { SignOutButton } from "@/features/auth/components/sign-out-button";

/**
 * Server-renderable shell (just the email text) around the one
 * genuinely interactive piece, SignOutButton. Keeping this as a plain
 * component instead of "use client" lets pages that render it stay
 * Server Components.
 */
export function AccountMenu({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
      <SignOutButton />
    </div>
  );
}
