"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/features/auth/hooks/use-change-password";

export function ChangePasswordForm() {
  const router = useRouter();
  const { changePassword, isSubmitting, error, isDone } = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { error: changeError } = await changePassword({
      currentPassword,
      newPassword,
    });
    if (!changeError) {
      router.refresh();
    }
  }

  if (isDone) {
    return (
      <p className="text-sm text-foreground">
        Password updated. Other sessions were signed out.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current (temporary) password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={isSubmitting}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
