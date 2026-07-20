import { apiFetch } from "@/lib/api/client";
import {
  removeShortlistDataSchema,
  shortlistItemDataSchema,
  shortlistListDataSchema,
  type RemoveShortlistData,
  type ShortlistItemData,
  type ShortlistListData,
  type ShortlistSource,
} from "@/features/shortlist/types/shortlist";

export async function listShortlist(): Promise<ShortlistListData> {
  const data = await apiFetch<unknown>("/api/shortlist");
  return shortlistListDataSchema.parse(data);
}

export async function addToShortlist(
  investorId: string,
  source: ShortlistSource,
): Promise<ShortlistItemData> {
  const data = await apiFetch<unknown>("/api/shortlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ investorId, source }),
  });

  return shortlistItemDataSchema.parse(data);
}

export async function removeFromShortlist(
  investorId: string,
): Promise<RemoveShortlistData> {
  const data = await apiFetch<unknown>(
    `/api/shortlist/${encodeURIComponent(investorId)}`,
    {
      method: "DELETE",
    },
  );

  return removeShortlistDataSchema.parse(data);
}
