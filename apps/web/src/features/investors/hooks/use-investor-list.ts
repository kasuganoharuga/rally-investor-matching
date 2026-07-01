"use client";

import { useCallback, useEffect, useState } from "react";

import { listInvestors } from "@/features/investors/api/investors-api";
import type { InvestorSummary } from "@/features/investors/types/investor";
import { ApiError } from "@/lib/api/errors";

type InvestorListState = {
  items: InvestorSummary[];
  isLoading: boolean;
  error: ApiError | null;
};

const INITIAL_STATE: InvestorListState = {
  items: [],
  isLoading: true,
  error: null,
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError({
    code: "CLIENT_ERROR",
    message: "Failed to load investors",
    status: 500,
  });
}

export function useInvestorList() {
  const [state, setState] = useState<InvestorListState>(INITIAL_STATE);

  const applyResult = useCallback(
    (result: { items: InvestorSummary[] } | { error: ApiError }) => {
      if ("error" in result) {
        setState({ items: [], isLoading: false, error: result.error });
        return;
      }

      setState({ items: result.items, isLoading: false, error: null });
    },
    [],
  );

  const fetchInvestors = useCallback(async () => {
    try {
      const data = await listInvestors();
      return { items: data.items };
    } catch (error) {
      return { error: toApiError(error) };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchInvestors().then((result) => {
      if (!cancelled) {
        applyResult(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applyResult, fetchInvestors]);

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    applyResult(await fetchInvestors());
  }, [applyResult, fetchInvestors]);

  return {
    ...state,
    reload,
  };
}
