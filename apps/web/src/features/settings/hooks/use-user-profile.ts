"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getUserProfile,
  updateUserProfile,
} from "@/features/settings/api/user-profile-api";
import type {
  UserProfile,
  UserProfileInput,
} from "@/features/settings/types/user-profile";
import { ApiError } from "@/lib/api/errors";

type UserProfileState = {
  profile: UserProfile | null;
  isLoading: boolean;
  error: ApiError | null;
};

const INITIAL_STATE: UserProfileState = {
  profile: null,
  isLoading: true,
  error: null,
};

function toApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError({ code: "CLIENT_ERROR", message: fallbackMessage, status: 500 });
}

export function useUserProfile() {
  const [state, setState] = useState<UserProfileState>(INITIAL_STATE);

  const fetchProfile = useCallback(async (): Promise<
    { profile: UserProfile } | { error: ApiError }
  > => {
    try {
      const profile = await getUserProfile();
      return { profile };
    } catch (error) {
      return { error: toApiError(error, "Failed to load your profile") };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchProfile().then((result) => {
      if (cancelled) {
        return;
      }
      if ("error" in result) {
        setState({ profile: null, isLoading: false, error: result.error });
        return;
      }
      setState({ profile: result.profile, isLoading: false, error: null });
    });

    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    const result = await fetchProfile();
    if ("error" in result) {
      setState({ profile: null, isLoading: false, error: result.error });
      return;
    }
    setState({ profile: result.profile, isLoading: false, error: null });
  }, [fetchProfile]);

  /**
   * Never throws: HTTP failures, network failures, and malformed
   * responses are all normalized into result.error, matching
   * useCompanyProfile's save() convention. The caller (UserProfileForm's
   * onSubmit) only needs to branch on result.error, never wrap this call
   * in try/catch.
   */
  const save = useCallback(
    async (
      input: UserProfileInput,
    ): Promise<{ data: UserProfile | null; error: ApiError | null }> => {
      try {
        const data = await updateUserProfile(input);
        setState((current) => ({ ...current, profile: data }));
        return { data, error: null };
      } catch (error) {
        return { data: null, error: toApiError(error, "Failed to save your profile") };
      }
    },
    [],
  );

  return {
    ...state,
    reload,
    save,
  };
}
