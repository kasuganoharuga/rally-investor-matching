import {
  managedInvestorListSchema,
  managedInvestorSchema,
  type ManagedInvestor,
  type UpdateInvestorReviewInput,
} from "@/features/investor-management/types/investor-management";
import { apiFetch } from "@/lib/api/client";

export async function getManagedInvestors(): Promise<ManagedInvestor[]> {
  const data = await apiFetch<unknown>("/api/admin/investors");
  return managedInvestorListSchema.parse(data).items;
}

export async function updateManagedInvestorReview(
  id: string,
  input: UpdateInvestorReviewInput,
): Promise<ManagedInvestor> {
  const data = await apiFetch<unknown>(`/api/admin/investors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return managedInvestorSchema.parse(data);
}
