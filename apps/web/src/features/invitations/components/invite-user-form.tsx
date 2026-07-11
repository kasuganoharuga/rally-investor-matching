"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/features/auth/types/auth";
import { invitableRolesFor } from "@/features/invitations/invite-role-policy";
import type { ApiError } from "@/lib/api/errors";

type InviteUserFormProps = {
  viewerRole: UserRole;
  onCreate: (input: {
    email: string;
    role: UserRole;
  }) => Promise<{ error: ApiError | null }>;
};

export function InviteUserForm({ viewerRole, onCreate }: InviteUserFormProps) {
  const roleOptions = invitableRolesFor(viewerRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(roleOptions[0] ?? "founder");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await onCreate({ email, role });

    setIsSubmitting(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setEmail("");
  }

  if (roleOptions.length === 0) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-role">Role</Label>
        <select
          id="invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          disabled={isSubmitting}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send invite"}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-destructive sm:basis-full">{errorMessage}</p>
      ) : null}
    </form>
  );
}
