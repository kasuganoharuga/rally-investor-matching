import { apiFetch } from "@/lib/api/client";
import {
  investorDetailSchema,
  investorListDataSchema,
  type InvestorDetail,
  type InvestorListData,
} from "@/features/investors/types/investor";

export async function listInvestors(): Promise<InvestorListData> {
  const data = await apiFetch<InvestorListData>("/api/investors");
  return investorListDataSchema.parse(data);
}

export async function getInvestor(slug: string): Promise<InvestorDetail> {
  const data = await apiFetch<InvestorDetail>(
    `/api/investors/${encodeURIComponent(slug)}`,
  );
  return investorDetailSchema.parse(data);
}
