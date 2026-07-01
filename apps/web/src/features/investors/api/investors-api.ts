import { apiFetch } from "@/lib/api/client";
import {
  investorListDataSchema,
  type InvestorListData,
} from "@/features/investors/types/investor";

export async function listInvestors(): Promise<InvestorListData> {
  const data = await apiFetch<InvestorListData>("/api/investors");
  return investorListDataSchema.parse(data);
}
