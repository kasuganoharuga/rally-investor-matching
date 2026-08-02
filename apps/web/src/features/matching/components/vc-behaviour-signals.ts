import type { MatchStagePreference } from "@/features/matching/types/match";

import { toNumber, weightedSignals } from "./vc-detail-utils";

/** Buckets that carry no meaning in a sentence. */
export const UNINFORMATIVE = new Set([
  "other",
  "others",
  "unknown",
  "none",
  "not_listed",
  "not_specified",
  "unclassified",
  "n_a",
]);

export const AI_PHRASES: Record<string, string> = {
  ai_native: "AI-native",
  ai_enabled: "AI-enabled",
  ai_adjacent: "AI-adjacent",
  ai_powered: "AI-powered",
};

export function joinList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

export function rankByDealWeight(
  preferences: MatchStagePreference[],
  pick: (preference: MatchStagePreference) => string[],
): { value: string; weight: number }[] {
  const weights = new Map<string, number>();
  for (const preference of preferences) {
    const weight = Math.max(toNumber(preference.deals_count) ?? 1, 1);
    for (const value of pick(preference)) {
      if (value && !UNINFORMATIVE.has(value.toLowerCase())) {
        weights.set(value, (weights.get(value) ?? 0) + weight);
      }
    }
  }
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, weight]) => ({ value, weight }));
}

/** How many distinct stages a value shows up at, regardless of deal volume. */
export function countStages(
  preferences: MatchStagePreference[],
  pick: (preference: MatchStagePreference) => string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const preference of preferences) {
    for (const value of new Set(pick(preference))) {
      if (value && !UNINFORMATIVE.has(value.toLowerCase())) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function topSignal(
  preferences: MatchStagePreference[],
  dimension: string,
  minShare = 0.25,
): string | null {
  const top = weightedSignals(preferences, dimension, 4).find(
    (signal) => !UNINFORMATIVE.has(signal.label.toLowerCase()),
  );
  return top && top.value >= minShare ? top.label : null;
}
