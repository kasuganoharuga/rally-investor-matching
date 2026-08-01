"use client";

import { useEffect, useState } from "react";

import { listMatchHistory } from "@/features/matching/api/match-api";
import type { MatchRecord } from "@/features/matching/types/match";
import { ApiError } from "@/lib/api/errors";

type MatchHistoryListState = {
  records: MatchRecord[];
  isLoading: boolean;
  error: ApiError | null;
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError({
    code: "CLIENT_ERROR",
    message: "Failed to load match history",
    status: 500,
  });
}

export function useMatchHistoryList() {
  const [state, setState] = useState<MatchHistoryListState>({
    records: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    void listMatchHistory()
      .then((history) => {
        if (!cancelled) {
          setState({ records: history.items, isLoading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ records: [], isLoading: false, error: toApiError(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
