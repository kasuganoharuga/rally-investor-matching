import "server-only";

import * as companyManagementRepository from "@/features/company-management/server/repositories/company-management-repository";
import type { ManagedCompany } from "@/features/company-management/types/company-management";
import type { CompanyProfileInput } from "@/features/company-profile/types/company-profile";
import { ApiError } from "@/lib/api/errors";

async function listCompanies(): Promise<ManagedCompany[]> {
  return companyManagementRepository.listCompanies();
}

async function updateCompany(
  id: string,
  input: CompanyProfileInput,
): Promise<ManagedCompany> {
  const updated = await companyManagementRepository.updateCompany(id, input);
  if (!updated) {
    throw new ApiError({
      code: "COMPANY_NOT_FOUND",
      message: "Company profile not found.",
      status: 404,
    });
  }

  const company = await companyManagementRepository.findCompanyById(id);
  if (!company) {
    throw new ApiError({
      code: "COMPANY_NOT_FOUND",
      message: "Company profile not found.",
      status: 404,
    });
  }
  return company;
}

export const companyManagementService = {
  listCompanies,
  updateCompany,
};
