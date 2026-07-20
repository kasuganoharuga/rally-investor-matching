"use client";

import { useCallback, useState } from "react";

import { authClient } from "@/features/auth/api/auth-client";
import type { AuthActionError } from "@/features/auth/hooks/use-login";
import { acceptInvitation } from "@/features/invitations/api/invitations-api";
import type { AcceptInvitationInput } from "@/features/invitations/types/invitation";
import { ApiError } from "@/lib/api/errors";

function toApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError({ code: "CLIENT_ERROR", message: fallbackMessage, status: 500 });
}

export function useAcceptInvitation() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthActionError | null>(null);

  const accept = useCallback(
    async (input: AcceptInvitationInput): Promise<{ error: AuthActionError | null }> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const accepted = await acceptInvitation(input);
        const { error: signInError } = await authClient.signIn.email({
          email: accepted.email,
          password: input.password,
        });

        if (signInError) {
          const authError = {
            message:
              "Account created, but automatic sign-in failed. Please sign in from the login page.",
          };
          setError(authError);
          return { error: authError };
        }

        return { error: null };
      } catch (unknownError) {
        const apiError = toApiError(unknownError, "Could not accept invitation");
        const authError = { message: apiError.message };
        setError(authError);
        return { error: authError };
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { accept, isSubmitting, error };
}
