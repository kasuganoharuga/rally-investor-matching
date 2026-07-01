import "server-only";

import { investorRepository } from "@/features/investors/server/repositories/investor-repository";
import {
  investorListDataSchema,
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
}

export const investorService = new InvestorService();
