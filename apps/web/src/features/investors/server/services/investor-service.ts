import "server-only";

import { InvestorError } from "@/features/investors/server/errors";
import { investorRepository } from "@/features/investors/server/repositories/investor-repository";
import {
  investorListDataSchema,
  type InvestorDetail,
  type InvestorListData,
} from "@/features/investors/types/investor";

export class InvestorService {
  async listSummaries(): Promise<InvestorListData> {
    const items = await investorRepository.listSummaries();
    const sortedItems = [...items].sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    return investorListDataSchema.parse({ items: sortedItems });
  }

  async getDetail(slug: string): Promise<InvestorDetail> {
    const investor = await investorRepository.getDetail(slug);
    if (!investor) {
      throw new InvestorError("INVESTOR_NOT_FOUND");
    }

    return investor;
  }
}

export const investorService = new InvestorService();
