import "server-only";

import {
  investorListDataSchema,
  type InvestorListData,
  type InvestorSummary,
} from "@/features/investors/types/investor";
import { apiFetch } from "@/lib/api/client";

const INVESTOR_API_BASE_URL =
  process.env.MATCHING_API_BASE_URL ?? "http://127.0.0.1:8000";

export class InvestorRepository {
  async listSummaries(): Promise<InvestorSummary[]> {
    const data = await apiFetch<InvestorListData>("/api/v1/investors", {
      baseUrl: INVESTOR_API_BASE_URL,
      cache: "no-store",
    });

    return investorListDataSchema.parse(data).items;
  }
}

export const investorRepository = new InvestorRepository();
