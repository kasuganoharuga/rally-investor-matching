import { apiFetch } from "@/lib/api/client";
import {
  companyProfileResponseSchema,
  type CompanyProfile,
  type CompanyProfileInput,
} from "@/features/company-profile/types/company-profile";

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  const data = await apiFetch<CompanyProfile | null>("/api/company-profile");
  return data === null ? null : companyProfileResponseSchema.parse(data);
}

export async function updateCompanyProfile(
  input: CompanyProfileInput,
): Promise<CompanyProfile> {
  const data = await apiFetch<CompanyProfile>("/api/company-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return companyProfileResponseSchema.parse(data);
}
