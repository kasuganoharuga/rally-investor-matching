import "server-only";

import type { CurrentUser } from "@/features/auth/server/session";
import { MatchingSettingsRepository } from "@/features/matching/server/repositories/matching-settings-repository";
import {
  resetMatchingSettingsSchema,
  saveMatchingSettingsSchema,
  scoringDefaults,
  type MatchingSettings,
} from "@/features/matching/types/matching-settings";
import { ApiError } from "@/lib/api/errors";

function forbidden(): never {
  throw new ApiError({
    code: "FORBIDDEN",
    message: "Only admins and reviewers can change matching settings.",
    status: 403,
  });
}

function conflict(): never {
  throw new ApiError({
    code: "MATCHING_SETTINGS_CONFLICT",
    message:
      "Settings changed in another session. Reload the page before saving again.",
    status: 409,
  });
}

export class MatchingSettingsService {
  constructor(private readonly repository = new MatchingSettingsRepository()) {}

  async getForUser(user: CurrentUser): Promise<MatchingSettings> {
    const global = await this.repository.getGlobal();
    // A role change must immediately stop using a previous personal override.
    const personal =
      user.role === "reviewer" ? await this.repository.getPersonal(user.id) : null;
    return {
      configuration: scoringDefaults(personal?.configuration ?? global.configuration),
      globalConfiguration: scoringDefaults(global.configuration),
      source: personal ? "personal" : "global",
      globalRevision: global.revision,
      personalRevision: personal?.revision ?? null,
    };
  }

  async save(user: CurrentUser, input: unknown): Promise<MatchingSettings> {
    if (user.role !== "admin" && user.role !== "reviewer") forbidden();
    const { configuration, expectedRevision } = saveMatchingSettingsSchema.parse(input);
    const weightSettings = scoringDefaults(configuration);
    const saved =
      user.role === "admin"
        ? await this.repository.saveGlobal(user.id, weightSettings, expectedRevision)
        : await this.repository.savePersonal(user.id, weightSettings, expectedRevision);
    if (!saved) conflict();
    return this.getForUser(user);
  }

  async resetPersonal(user: CurrentUser, input: unknown): Promise<MatchingSettings> {
    if (user.role !== "reviewer") forbidden();
    const { expectedRevision } = resetMatchingSettingsSchema.parse(input);
    if (!(await this.repository.resetPersonal(user.id, expectedRevision))) conflict();
    return this.getForUser(user);
  }
}

export const matchingSettingsService = new MatchingSettingsService();
