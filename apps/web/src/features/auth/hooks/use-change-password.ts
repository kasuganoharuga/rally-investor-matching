"use client";

import { useCallback, useState } from "react";

import { authClient } from "@/features/auth/api/auth-client";
import type { AuthActionError } from "@/features/auth/hooks/use-login";
import type { ChangePasswordInput } from "@/features/auth/types/credentials";

export function useChangePassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthActionError | null>(null);
  const [isDone, setIsDone] = useState(false);

  const changePassword = useCallback(
    async (input: ChangePasswordInput): Promise<{ error: AuthActionError | null }> => {
      setIsSubmitting(true);
      setError(null);

      // A leaked/shared temporary password should not leave old sessions
      // valid once the real owner sets their own.
      const { error: changeError } = await authClient.changePassword({
        ...input,
        revokeOtherSessions: true,
      });

      setIsSubmitting(false);
      if (changeError) {
        const authError = {
          message: changeError.message ?? "Could not change password.",
        };
        setError(authError);
        return { error: authError };
      }
      setIsDone(true);
      return { error: null };
    },
    [],
  );

  return { changePassword, isSubmitting, error, isDone };
}
