"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getManagedInvestors,
  updateManagedInvestorReview,
} from "@/features/investor-management/api/investor-management-api";
import type {
  ManagedInvestor,
  UpdateInvestorReviewInput,
} from "@/features/investor-management/types/investor-management";
import { ApiError } from "@/lib/api/errors";

function toApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({ code: "CLIENT_ERROR", message: fallback, status: 500 });
}

export function useInvestorManagement() {
  const [items, setItems] = useState<ManagedInvestor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      return { items: await getManagedInvestors(), error: null };
    } catch (loadError) {
      return {
        items: [],
        error: toApiError(loadError, "Unable to load investor review queue."),
      };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchItems().then((result) => {
      if (cancelled) return;
      setItems(result.items);
      setError(result.error);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchItems]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await fetchItems();
    setItems(result.items);
    setError(result.error);
    setIsLoading(false);
  }, [fetchItems]);

  const review = useCallback(async (id: string, input: UpdateInvestorReviewInput) => {
    try {
      const investor = await updateManagedInvestorReview(id, input);
      setItems((current) =>
        current.map((item) => (item.id === investor.id ? investor : item)),
      );
      return { data: investor, error: null };
    } catch (reviewError) {
      return {
        data: null,
        error: toApiError(reviewError, "Unable to update review status."),
      };
    }
  }, []);

  return { items, isLoading, error, reload, review };
}
