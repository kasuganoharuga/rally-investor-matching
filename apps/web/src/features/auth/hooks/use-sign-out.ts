"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { authClient } from "@/features/auth/api/auth-client";
import type { AuthActionError } from "@/features/auth/hooks/use-login";

export function useSignOut() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<AuthActionError | null>(null);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    setError(null);

    // Wrapped in try/catch/finally (unlike a bare await) so a thrown
    // network error, or an { error } response from the client, always
    // clears isSigningOut instead of leaving the button disabled forever.
    try {
      const { error: signOutError } = await authClient.signOut();
      if (signOutError) {
        setError({ message: signOutError.message ?? "Could not sign out." });
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError({
        message: "Could not sign out. Check your connection and try again.",
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [router]);

  return { signOut, isSigningOut, error };
}
