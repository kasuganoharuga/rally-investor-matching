import "server-only";

import type { CurrentUser } from "@/features/auth/server/session";
import {
  findByOwner as findCompanyProfileByOwner,
  upsertForOwner as upsertCompanyProfileForOwner,
} from "@/features/company-profile/server/repositories/company-profile-repository";
import type {
  CompanyProfile,
  CompanyProfileInput,
} from "@/features/company-profile/types/company-profile";
import { recomputeOnboardingStatus } from "@/features/onboarding/server/recompute-onboarding-status";
import { withTransaction } from "@/lib/server/db";

export class CompanyProfileService {
  async getForOwner(owner: CurrentUser): Promise<CompanyProfile | null> {
    return findCompanyProfileByOwner(owner.id);
  }

  /**
   * Upsert + onboarding recompute share one transaction so a concurrent
   * settings save serializes on the same user_profiles row lock instead
   * of each recomputing onboarding_status from a stale read of the
   * other's write.
   */
  async upsertForOwner(
    owner: CurrentUser,
    input: CompanyProfileInput,
  ): Promise<CompanyProfile> {
    return withTransaction(async (client) => {
      const profile = await upsertCompanyProfileForOwner(owner.id, input, client);
      await recomputeOnboardingStatus(client, owner.id, owner.role);
      return profile;
    });
  }
}

export const companyProfileService = new CompanyProfileService();
