import {
  managedCompanyListSchema,
  managedCompanySchema,
  type ManagedCompany,
} from "@/features/company-management/types/company-management";
import type { CompanyProfileInput } from "@/features/company-profile/types/company-profile";
import { apiFetch } from "@/lib/api/client";

export async function getManagedCompanies(): Promise<ManagedCompany[]> {
  const data = await apiFetch<unknown>("/api/admin/companies");
  return managedCompanyListSchema.parse(data).items;
}

export async function updateManagedCompany(
  id: string,
  input: CompanyProfileInput,
): Promise<ManagedCompany> {
  const data = await apiFetch<unknown>(`/api/admin/companies/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return managedCompanySchema.parse(data);
}
