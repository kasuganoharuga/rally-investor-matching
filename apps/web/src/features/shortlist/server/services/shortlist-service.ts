import "server-only";

import type { CurrentUser } from "@/features/auth/server/session";
import { investorRepository } from "@/features/investors/server/repositories/investor-repository";
import {
  investorSummarySchema,
  type InvestorSummary,
} from "@/features/investors/types/investor";
import {
  removeShortlistDataSchema,
  shortlistItemDataSchema,
  shortlistListDataSchema,
  type AddShortlistInput,
  type RemoveShortlistData,
  type ShortlistItemData,
  type ShortlistListData,
} from "@/features/shortlist/types/shortlist";
import {
  shortlistRepository,
  type ShortlistRow,
} from "@/features/shortlist/server/repositories/shortlist-repository";
import { ApiError } from "@/lib/api/errors";

function toItem(row: ShortlistRow, investor: InvestorSummary) {
  return {
    id: row.id,
    investor,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ShortlistService {
  async list(user: CurrentUser): Promise<ShortlistListData> {
    const rows = await shortlistRepository.listForUser(user.id);
    if (rows.length === 0) {
      return shortlistListDataSchema.parse({ items: [] });
    }

    const investors = await investorRepository.listSummaries();
    const investorsById = new Map(
      investors.map((investor) => [investor.id, investor] as const),
    );
    const items = rows.flatMap((row) => {
      const investor = investorsById.get(row.investorId);
      return investor ? [toItem(row, investor)] : [];
    });

    return shortlistListDataSchema.parse({ items });
  }

  async add(input: AddShortlistInput, user: CurrentUser): Promise<ShortlistItemData> {
    const row = await shortlistRepository.upsertForUser({
      userId: user.id,
      investorIdOrSlug: input.investorId,
      source: input.source,
    });

    if (!row) {
      throw new ApiError({
        code: "INVESTOR_NOT_FOUND",
        message: "Investor could not be found.",
        status: 404,
      });
    }

    const investor = await investorRepository.getDetail(row.investorId);
    if (!investor) {
      throw new ApiError({
        code: "INVESTOR_NOT_FOUND",
        message: "Investor could not be loaded.",
        status: 404,
      });
    }

    return shortlistItemDataSchema.parse({
      item: toItem(row, investorSummarySchema.parse(investor)),
    });
  }

  async remove(investorId: string, user: CurrentUser): Promise<RemoveShortlistData> {
    const removedInvestorId = await shortlistRepository.softDeleteForUser({
      userId: user.id,
      investorIdOrSlug: investorId,
    });

    return removeShortlistDataSchema.parse({
      investorId: removedInvestorId ?? investorId,
    });
  }
}

export const shortlistService = new ShortlistService();
