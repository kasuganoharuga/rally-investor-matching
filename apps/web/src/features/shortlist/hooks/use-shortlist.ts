"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  addToShortlist,
  listShortlist,
  removeFromShortlist,
} from "@/features/shortlist/api/shortlist-api";
import type {
  ShortlistItem,
  ShortlistSource,
} from "@/features/shortlist/types/shortlist";
import { ApiError } from "@/lib/api/errors";

type ShortlistState = {
  items: ShortlistItem[];
  shortlistedIds: Set<string>;
  pendingIds: Set<string>;
  isLoading: boolean;
  error: ApiError | null;
};

const INITIAL_STATE: ShortlistState = {
  items: [],
  shortlistedIds: new Set(),
  pendingIds: new Set(),
  isLoading: true,
  error: null,
};

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError({
    code: "CLIENT_ERROR",
    message: "Unable to update your shortlist.",
    status: 500,
  });
}

function idsFromItems(items: ShortlistItem[]): Set<string> {
  return new Set(items.map((item) => item.investor.id));
}

export function useShortlist() {
  const [state, setState] = useState<ShortlistState>(INITIAL_STATE);

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const data = await listShortlist();
      setState((current) => ({
        ...current,
        items: data.items,
        shortlistedIds: idsFromItems(data.items),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: toApiError(error),
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isShortlisted = useCallback(
    (investorId: string) => state.shortlistedIds.has(investorId),
    [state.shortlistedIds],
  );

  const isPending = useCallback(
    (investorId: string) => state.pendingIds.has(investorId),
    [state.pendingIds],
  );

  const toggle = useCallback(
    async (investorId: string, source: ShortlistSource) => {
      if (state.pendingIds.has(investorId)) {
        return;
      }

      const wasShortlisted = state.shortlistedIds.has(investorId);

      setState((current) => {
        const pendingIds = new Set(current.pendingIds).add(investorId);
        const shortlistedIds = new Set(current.shortlistedIds);
        if (wasShortlisted) {
          shortlistedIds.delete(investorId);
        } else {
          shortlistedIds.add(investorId);
        }
        return { ...current, pendingIds, shortlistedIds, error: null };
      });

      try {
        if (wasShortlisted) {
          await removeFromShortlist(investorId);
          setState((current) => ({
            ...current,
            items: current.items.filter((item) => item.investor.id !== investorId),
          }));
        } else {
          const data = await addToShortlist(investorId, source);
          setState((current) => {
            const withoutDuplicate = current.items.filter(
              (item) => item.investor.id !== data.item.investor.id,
            );
            const shortlistedIds = new Set(current.shortlistedIds).add(
              data.item.investor.id,
            );
            return {
              ...current,
              items: [data.item, ...withoutDuplicate],
              shortlistedIds,
            };
          });
        }
      } catch (error) {
        setState((current) => {
          const shortlistedIds = new Set(current.shortlistedIds);
          if (wasShortlisted) {
            shortlistedIds.add(investorId);
          } else {
            shortlistedIds.delete(investorId);
          }
          return {
            ...current,
            shortlistedIds,
            error: toApiError(error),
          };
        });
      } finally {
        setState((current) => {
          const pendingIds = new Set(current.pendingIds);
          pendingIds.delete(investorId);
          return { ...current, pendingIds };
        });
      }
    },
    [state.pendingIds, state.shortlistedIds],
  );

  return useMemo(
    () => ({
      items: state.items,
      isLoading: state.isLoading,
      error: state.error,
      refresh,
      isShortlisted,
      isPending,
      toggle,
    }),
    [
      isPending,
      isShortlisted,
      refresh,
      state.error,
      state.isLoading,
      state.items,
      toggle,
    ],
  );
}
