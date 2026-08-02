import type { MatchStagePreference } from "@/features/matching/types/match";

import { UNINFORMATIVE, joinList } from "./vc-behaviour-signals";
import type { RankedSignals } from "./vc-behaviour-ranked-signals";
import type { BehaviourProfile, StageBehaviour } from "./vc-behaviour-types";
import { labelFromCode, proseFromCode, weightedSignals } from "./vc-detail-utils";

export function buildFitConclusions(input: {
  preferences: MatchStagePreference[];
  stages: StageBehaviour[];
  coreEntry: string;
  leadRatio: number;
  totalDeals: number;
  dataQuality: string | null;
  signals: RankedSignals;
}): Pick<
  BehaviourProfile,
  | "strongestThemes"
  | "sectorTiers"
  | "recurringThemes"
  | "onceOffThemes"
  | "bestFit"
  | "lessProven"
  | "confidence"
> {
  const { preferences, stages, coreEntry, leadRatio, totalDeals, signals } = input;
  const {
    strongSectors,
    moderateSectors,
    limitedSectors,
    recurringThemes,
    onceOffThemes,
    customer,
    model,
    modelCode,
    customerCode,
    aiPhrase,
  } = signals;

  const outerStages = stages.filter(
    (stage) => stage.conviction === "selective" || stage.conviction === "opportunistic",
  );

  const bestFit = [
    `Raising a ${coreEntry} round`,
    leadRatio >= 0.6
      ? "Looking for a lead or co-lead investor"
      : "Comfortable with a participating investor alongside a lead",
    customer ? `Selling to ${proseFromCode(customerCode as string)} customers` : null,
    model ? `Running a ${proseFromCode(modelCode as string)} business model` : null,
    aiPhrase && aiPhrase !== "None"
      ? `Building ${aiPhrase} or technically differentiated products`
      : null,
  ].filter((value): value is string => Boolean(value));

  // Profile dimensions only — the thinly-evidenced sectors get their own tier
  // below, and repeating them here just reads as the same list twice.
  const weakBuckets = (dimension: string, suffix: string): string[] =>
    weightedSignals(preferences, dimension, 8)
      .filter(
        (signal) =>
          !UNINFORMATIVE.has(signal.label.toLowerCase()) && signal.value < 0.25,
      )
      .slice(0, 2)
      .map((signal) => `${labelFromCode(signal.label)} ${suffix}`);

  const lessProven = [
    ...weakBuckets("customer_type", "customers"),
    ...weakBuckets("business_model", "business models"),
    outerStages.length > 0
      ? `Rounds outside ${coreEntry} — ${joinList(
          outerStages.map((stage) => stage.stageLabel),
        )}`
      : null,
  ].filter((value): value is string => Boolean(value));

  const sectorConfidence =
    totalDeals >= 8 && input.dataQuality === "high" ? "High" : "Medium";

  return {
    // One line on the overview; the full tiering lives in the evidence tab.
    strongestThemes: [
      ...strongSectors.slice(0, 2).map((item) => labelFromCode(item.value)),
      ...(model ? [model] : []),
    ].slice(0, 3),
    sectorTiers: {
      strong: strongSectors.map((item) => labelFromCode(item.value)),
      moderate: moderateSectors.map((item) => labelFromCode(item.value)),
      limited: limitedSectors.map((item) => labelFromCode(item.value)),
    },
    recurringThemes,
    onceOffThemes,
    bestFit: bestFit.slice(0, 5),
    lessProven: lessProven.slice(0, 3),
    confidence: [
      `${sectorConfidence} confidence in individual sector preferences — absence of a sector here means no observed deal, not a stated exclusion.`,
    ],
  };
}
