import "server-only";

import * as investorManagementRepository from "@/features/investor-management/server/repositories/investor-management-repository";
import type {
  ManagedInvestor,
  UpdateInvestorReviewInput,
} from "@/features/investor-management/types/investor-management";
import { ApiError } from "@/lib/api/errors";
import { withTransaction } from "@/lib/server/db";

async function listInvestors(): Promise<ManagedInvestor[]> {
  return investorManagementRepository.listInvestors();
}

async function updateReview(
  id: string,
  reviewerId: string,
  input: UpdateInvestorReviewInput,
): Promise<ManagedInvestor> {
  return withTransaction(async (client) => {
    const current = await investorManagementRepository.findInvestorById(id, client);
    if (!current) {
      throw new ApiError({
        code: "INVESTOR_NOT_FOUND",
        message: "Investor not found.",
        status: 404,
      });
    }

    await investorManagementRepository.updateReviewStatus(
      id,
      input.reviewStatus,
      reviewerId,
      client,
    );
    await investorManagementRepository.recordReview(
      id,
      reviewerId,
      current.reviewStatus,
      input.reviewStatus,
      input.note ?? null,
      client,
    );

    const updated = await investorManagementRepository.findInvestorById(id, client);
    if (!updated) {
      throw new ApiError({
        code: "INVESTOR_NOT_FOUND",
        message: "Investor not found.",
        status: 404,
      });
    }
    return updated;
  });
}

export const investorManagementService = { listInvestors, updateReview };
