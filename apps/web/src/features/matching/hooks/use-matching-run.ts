"use client";

import { useCallback, useEffect, useState } from "react";

import { getMatchingRun } from "@/features/matching/api/match-api";
import type { MatchRecord } from "@/features/matching/types/match";
import { ApiError } from "@/lib/api/errors";

type MatchingRunState = {
  record: MatchRecord | null;
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
};

const INITIAL_STATE: MatchingRunState = {
  record: null,
  isLoading: true,
  error: null,
  notFound: false,
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError({
    code: "CLIENT_ERROR",
    message: "Failed to load this match",
    status: 500,
  });
}

export function useMatchingRun(runId: string) {
  const [state, setState] = useState<MatchingRunState>(INITIAL_STATE);

  const applyResult = useCallback(
    (result: { record: MatchRecord } | { error: ApiError }) => {
      if ("error" in result) {
        setState({
          record: null,
          isLoading: false,
          error: result.error,
          notFound: result.error.status === 404,
        });
        return;
      }

      setState({
        record: result.record,
        isLoading: false,
        error: null,
        notFound: false,
      });
    },
    [],
  );

  const fetchRun = useCallback(async () => {
    try {
      const record = await getMatchingRun(runId);
      return { record };
    } catch (error) {
      return { error: toApiError(error) };
    }
  }, [runId]);

  useEffect(() => {
    let cancelled = false;

    void fetchRun().then((result) => {
      if (!cancelled) {
        applyResult(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applyResult, fetchRun]);

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    applyResult(await fetchRun());
  }, [applyResult, fetchRun]);

  return {
    ...state,
    reload,
  };
}
