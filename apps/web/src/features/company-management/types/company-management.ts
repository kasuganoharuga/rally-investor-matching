import { z } from "zod";

import { companyProfileResponseSchema } from "@/features/company-profile/types/company-profile";

export const managedCompanyOwnerSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  roleAtCompany: z.string().nullable(),
  onboardingStatus: z.string().nullable(),
});

export const managedCompanyMatchingProfileSchema = z.object({
  id: z.string(),
  stage: z.string().nullable(),
  sectorPrimary: z.string().nullable(),
  useCasePrimary: z.string().nullable(),
  customerType: z.string().nullable(),
  businessModel: z.string().nullable(),
  targetGeographies: z.array(z.string()),
  raiseAmountMin: z.number().nullable(),
  raiseAmountMax: z.number().nullable(),
  raiseCurrency: z.string().nullable(),
  updatedAt: z.string(),
});

export const managedCompanySchema = z.object({
  id: z.string(),
  owner: managedCompanyOwnerSchema,
  profile: companyProfileResponseSchema,
  currentMatchingProfile: managedCompanyMatchingProfileSchema.nullable(),
  documentCount: z.number().int().nonnegative(),
  matchRunCount: z.number().int().nonnegative(),
  lastMatchedAt: z.string().nullable(),
});

export const managedCompanyListSchema = z.object({
  items: z.array(managedCompanySchema),
});

export type ManagedCompany = z.infer<typeof managedCompanySchema>;
export type ManagedCompanyMatchingProfile = z.infer<
  typeof managedCompanyMatchingProfileSchema
>;

const PROFILE_COMPLETION_FIELDS = [
  "name",
  "websiteUrl",
  "linkedinUrl",
  "oneLiner",
  "description",
  "hqCountry",
  "foundedYear",
] as const;

export function companyProfileCompletion(company: ManagedCompany): number {
  const completed = PROFILE_COMPLETION_FIELDS.filter((field) => {
    const value = company.profile[field];
    return (
      typeof value === "number" || (typeof value === "string" && value.trim() !== "")
    );
  }).length;
  return Math.round((completed / PROFILE_COMPLETION_FIELDS.length) * 100);
}

export type ManagedCompanyStatus = "ready" | "needs-details" | "no-match-profile";

export function managedCompanyStatus(company: ManagedCompany): ManagedCompanyStatus {
  if (!company.currentMatchingProfile) return "no-match-profile";
  if (companyProfileCompletion(company) < 70) return "needs-details";
  return "ready";
}
