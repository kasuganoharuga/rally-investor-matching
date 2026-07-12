"use client";

import { useCallback, useEffect, useState } from "react";

import { getInvestor } from "@/features/investors/api/investors-api";
import type { InvestorDetail } from "@/features/investors/types/investor";
import { ApiError } from "@/lib/api/errors";

type InvestorDetailState = {
  investor: InvestorDetail | null;
  isLoading: boolean;
  error: ApiError | null;
  notFound: boolean;
};

const INITIAL_STATE: InvestorDetailState = {
  investor: null,
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
    message: "Failed to load investor",
    status: 500,
  });
}

export function useInvestorDetail(slug: string) {
  const [state, setState] = useState<InvestorDetailState>(INITIAL_STATE);

  const applyResult = useCallback(
    (result: { investor: InvestorDetail } | { error: ApiError }) => {
      if ("error" in result) {
        setState({
          investor: null,
          isLoading: false,
          error: result.error,
          notFound: result.error.status === 404,
        });
        return;
      }

      setState({
        investor: result.investor,
        isLoading: false,
        error: null,
        notFound: false,
      });
    },
    [],
  );

  const fetchInvestor = useCallback(async () => {
    try {
      const investor = await getInvestor(slug);
      return { investor };
    } catch (error) {
      return { error: toApiError(error) };
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    void fetchInvestor().then((result) => {
      if (!cancelled) {
        applyResult(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applyResult, fetchInvestor]);

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    applyResult(await fetchInvestor());
  }, [applyResult, fetchInvestor]);

  return {
    ...state,
    reload,
  };
}
