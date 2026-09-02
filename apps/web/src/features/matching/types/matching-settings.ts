import { z } from "zod";

import type { UserRole } from "@/features/auth/types/auth";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  matchingConfigurationSchema,
  type MatchingConfiguration,
} from "@/features/matching/types/match";

export const matchingSettingsSchema = z.object({
  configuration: matchingConfigurationSchema,
  globalConfiguration: matchingConfigurationSchema,
  source: z.enum(["global", "personal"]),
  globalRevision: z.number().int().min(1),
  personalRevision: z.number().int().min(1).nullable(),
});

export type MatchingSettings = z.infer<typeof matchingSettingsSchema>;

// The role and target user always come from the authenticated session, never
// from the request body. Reject scope/user fields rather than silently accepting them.
export const saveMatchingSettingsSchema = z
  .object({
    configuration: matchingConfigurationSchema,
    expectedRevision: z.number().int().min(0),
  })
  .strict();

export const resetMatchingSettingsSchema = z
  .object({ expectedRevision: z.number().int().min(1) })
  .strict();

export type SaveMatchingSettings = z.infer<typeof saveMatchingSettingsSchema>;

export function sameMatchingWeights(
  left: MatchingSettings["configuration"],
  right: MatchingSettings["configuration"],
): boolean {
  return Object.entries(left.weights).every(
    ([key, value]) => right.weights[key as keyof typeof right.weights] === value,
  );
}

/** Only weights persist. Other Step 4 controls remain options for this match. */
export function scoringDefaults(
  configuration: MatchingConfiguration,
): MatchingConfiguration {
  return matchingConfigurationSchema.parse({
    ...DEFAULT_MATCHING_CONFIGURATION,
    weights: configuration.weights,
  });
}

export function resolveMatchingConfiguration(
  role: UserRole,
  savedConfiguration: MatchingConfiguration,
  requested?: MatchingConfiguration,
): MatchingConfiguration {
  return matchingConfigurationSchema.parse({
    ...(role === "founder"
      ? DEFAULT_MATCHING_CONFIGURATION
      : (requested ?? DEFAULT_MATCHING_CONFIGURATION)),
    // No role may bypass the explicit saved/published weights through intake.
    weights: savedConfiguration.weights,
  });
}
