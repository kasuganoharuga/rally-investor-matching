"use client";

import { useCallback, useState } from "react";

import { authClient } from "@/features/auth/api/auth-client";
import type { LoginInput } from "@/features/auth/types/credentials";

/**
 * Better Auth's client returns `{ data, error }` instead of throwing, and
 * its error shape isn't the same `{ code, message, request_id }` envelope
 * our own `/api/*` routes use — so this stays a small local type instead
 * of reusing `ApiError`.
 */
export type AuthActionError = { message: string };

export function useLogin() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthActionError | null>(null);

  const login = useCallback(
    async (input: LoginInput): Promise<{ error: AuthActionError | null }> => {
      setIsSubmitting(true);
      setError(null);

      const { error: signInError } = await authClient.signIn.email(input);

      setIsSubmitting(false);
      if (signInError) {
        const authError = { message: signInError.message ?? "Could not sign in." };
        setError(authError);
        return { error: authError };
      }
      return { error: null };
    },
    [],
  );

  return { login, isSubmitting, error };
}
