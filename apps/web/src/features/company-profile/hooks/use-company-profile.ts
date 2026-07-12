"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getCompanyProfile,
  updateCompanyProfile,
} from "@/features/company-profile/api/company-profile-api";
import type {
  CompanyProfile,
  CompanyProfileInput,
} from "@/features/company-profile/types/company-profile";
import { ApiError } from "@/lib/api/errors";

type CompanyProfileState = {
  profile: CompanyProfile | null;
  isLoading: boolean;
  error: ApiError | null;
};

const INITIAL_STATE: CompanyProfileState = {
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

export function useCompanyProfile() {
  const [state, setState] = useState<CompanyProfileState>(INITIAL_STATE);

  const fetchProfile = useCallback(async (): Promise<
    { profile: CompanyProfile | null } | { error: ApiError }
  > => {
    try {
      const profile = await getCompanyProfile();
      return { profile };
    } catch (error) {
      return { error: toApiError(error, "Failed to load company profile") };
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
   * useInvitationList's create()/revoke() convention. The caller
   * (CompanyProfileForm's onSubmit) only needs to branch on
   * result.error, never wrap this call in try/catch.
   */
  const save = useCallback(
    async (
      input: CompanyProfileInput,
    ): Promise<{ data: CompanyProfile | null; error: ApiError | null }> => {
      try {
        const data = await updateCompanyProfile(input);
        setState((current) => ({ ...current, profile: data }));
        return { data, error: null };
      } catch (error) {
        return {
          data: null,
          error: toApiError(error, "Failed to save company profile"),
        };
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
