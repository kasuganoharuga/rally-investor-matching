import "server-only";

import type { CurrentUser } from "@/features/auth/server/session";
import { recomputeOnboardingStatus } from "@/features/onboarding/server/recompute-onboarding-status";
import {
  ensureActiveUserProfile,
  findByUser as findUserProfileByUser,
  upsertForUser as upsertUserProfileForUser,
} from "@/features/settings/server/repositories/user-profile-repository";
import type {
  UserProfile,
  UserProfileInput,
} from "@/features/settings/types/user-profile";
import { withTransaction } from "@/lib/server/db";

export class UserProfileService {
  async getForUser(user: CurrentUser): Promise<UserProfile> {
    await ensureActiveUserProfile(user.id);
    const profile = await findUserProfileByUser(user.id);
    if (!profile) {
      // Defensive: ensureActiveUserProfile just wrote (or restored) this
      // exact row — a miss here would mean something deleted it in the
      // instant between those two queries, which should never happen.
      throw new Error(
        "findByUser returned no row immediately after ensureActiveUserProfile",
      );
    }
    return profile;
  }

  /**
   * Upsert + onboarding recompute share one transaction so a concurrent
   * company-profile save serializes on the same user_profiles row lock
   * instead of each recomputing onboarding_status from a stale read of
   * the other's write.
   */
  async upsertForUser(
    user: CurrentUser,
    input: UserProfileInput,
  ): Promise<UserProfile> {
    return withTransaction(async (client) => {
      await upsertUserProfileForUser(user.id, input, client);
      await recomputeOnboardingStatus(client, user.id, user.role);

      // Re-read after the recompute: the upsert's own RETURNING would
      // still carry the pre-recompute onboarding_status.
      const refreshed = await findUserProfileByUser(user.id, client);
      if (!refreshed) {
        throw new Error("findByUser returned no row immediately after upsertForUser");
      }
      return refreshed;
    });
  }
}

export const userProfileService = new UserProfileService();
