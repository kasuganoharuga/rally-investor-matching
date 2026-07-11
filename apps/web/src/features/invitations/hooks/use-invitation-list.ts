"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createInvitation,
  listInvitations,
  revokeInvitation,
} from "@/features/invitations/api/invitations-api";
import type {
  CreateInvitationInput,
  InvitationSummary,
} from "@/features/invitations/types/invitation";
import { ApiError } from "@/lib/api/errors";

type InvitationListState = {
  items: InvitationSummary[];
  isLoading: boolean;
  error: ApiError | null;
};

const INITIAL_STATE: InvitationListState = {
  items: [],
  isLoading: true,
  error: null,
};

function toApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  return new ApiError({ code: "CLIENT_ERROR", message: fallbackMessage, status: 500 });
}

export function useInvitationList() {
  const [state, setState] = useState<InvitationListState>(INITIAL_STATE);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const applyResult = useCallback(
    (result: { items: InvitationSummary[] } | { error: ApiError }) => {
      if ("error" in result) {
        setState({ items: [], isLoading: false, error: result.error });
        return;
      }
      setState({ items: result.items, isLoading: false, error: null });
    },
    [],
  );

  const fetchInvitations = useCallback(async () => {
    try {
      const data = await listInvitations();
      return { items: data.items };
    } catch (error) {
      return { error: toApiError(error, "Failed to load invitations") };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchInvitations().then((result) => {
      if (!cancelled) {
        applyResult(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applyResult, fetchInvitations]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    applyResult(await fetchInvitations());
  }, [applyResult, fetchInvitations]);

  const create = useCallback(
    async (input: CreateInvitationInput): Promise<{ error: ApiError | null }> => {
      try {
        const created = await createInvitation(input);
        setState((current) => ({
          ...current,
          items: [created, ...current.items],
        }));
        return { error: null };
      } catch (error) {
        return { error: toApiError(error, "Failed to create invitation") };
      }
    },
    [],
  );

  const revoke = useCallback(
    async (id: string): Promise<{ error: ApiError | null }> => {
      setRevokingId(id);
      try {
        await revokeInvitation(id);
        setState((current) => ({
          ...current,
          items: current.items.map((item) =>
            item.id === id ? { ...item, status: "revoked" } : item,
          ),
        }));
        return { error: null };
      } catch (error) {
        return { error: toApiError(error, "Failed to revoke invitation") };
      } finally {
        setRevokingId(null);
      }
    },
    [],
  );

  return {
    ...state,
    reload: load,
    create,
    revoke,
    revokingId,
  };
}
