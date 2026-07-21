"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getManagedCompanies,
  updateManagedCompany,
} from "@/features/company-management/api/company-management-api";
import type { ManagedCompany } from "@/features/company-management/types/company-management";
import type { CompanyProfileInput } from "@/features/company-profile/types/company-profile";
import { ApiError } from "@/lib/api/errors";

function toApiError(error: unknown, fallback: string): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError({ code: "CLIENT_ERROR", message: fallback, status: 500 });
}

export function useCompanyManagement() {
  const [items, setItems] = useState<ManagedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      return { items: await getManagedCompanies(), error: null };
    } catch (loadError) {
      return {
        items: [],
        error: toApiError(loadError, "Unable to load company profiles."),
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

  const save = useCallback(async (id: string, input: CompanyProfileInput) => {
    try {
      const company = await updateManagedCompany(id, input);
      setItems((current) =>
        current.map((item) => (item.id === company.id ? company : item)),
      );
      return { data: company, error: null };
    } catch (saveError) {
      return {
        data: null,
        error: toApiError(saveError, "Unable to update company profile."),
      };
    }
  }, []);

  return { items, isLoading, error, reload, save };
}
