import "server-only";

import {
  investorDetailSchema,
  investorListDataSchema,
  type InvestorDetail,
  type InvestorListData,
  type InvestorSummary,
} from "@/features/investors/types/investor";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

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

  async getDetail(slug: string): Promise<InvestorDetail | null> {
    try {
      const data = await apiFetch<InvestorDetail>(
        `/api/v1/investors/${encodeURIComponent(slug)}`,
        {
          baseUrl: INVESTOR_API_BASE_URL,
          cache: "no-store",
        },
      );
      return investorDetailSchema.parse(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

export const investorRepository = new InvestorRepository();
