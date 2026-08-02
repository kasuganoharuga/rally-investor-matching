import type { MatchStagePreference } from "@/features/matching/types/match";

import {
  AI_PHRASES,
  countStages,
  joinList,
  rankByDealWeight,
  topSignal,
} from "./vc-behaviour-signals";
import type { StageBehaviour } from "./vc-behaviour-types";
import { labelFromCode } from "./vc-detail-utils";

type WeightedItem = { value: string; weight: number };

export type RankedSignals = {
  sectorRanking: WeightedItem[];
  strongSectors: WeightedItem[];
  moderateSectors: WeightedItem[];
  limitedSectors: WeightedItem[];
  recurringThemes: string[];
  onceOffThemes: string[];
  customerCode: string | null;
  modelCode: string | null;
  aiCode: string | null;
  customer: string | null;
  model: string | null;
  aiPhrase: string | null;
};

export function rankBehaviourSignals(
  preferences: MatchStagePreference[],
  sectorFocus: string[],
  themeFocus: string[],
): RankedSignals {
  const sectorRanking = rankByDealWeight(preferences, (preference) =>
    preference.actual_sector.length > 0 ? preference.actual_sector : sectorFocus,
  );
  const themeRanking = rankByDealWeight(preferences, (preference) =>
    preference.actual_themes.length > 0 ? preference.actual_themes : themeFocus,
  );
  const maxSectorWeight = sectorRanking[0]?.weight ?? 0;

  // Every sector lands in exactly one tier. An earlier split used
  // `>= max*0.6` and `<= max*0.3` with nothing in between, so mid-weight
  // sectors fell through the gap and only ever surfaced in a flat
  // "every observed sector" dump — unranked, and duplicating the rest.
  const strongSectors = sectorRanking.filter(
    (item) => item.weight >= maxSectorWeight * 0.6,
  );
  const moderateSectors = sectorRanking.filter(
    (item) =>
      item.weight < maxSectorWeight * 0.6 && item.weight > maxSectorWeight * 0.3,
  );
  const limitedSectors = sectorRanking.filter(
    (item) => item.weight <= maxSectorWeight * 0.3,
  );

  // A theme seen at two different stages is a pattern; one seen in a single
  // deal is an artefact of that deal. Splitting them beats a flat cloud of 14.
  const themeStageCounts = countStages(preferences, (preference) =>
    preference.actual_themes.length > 0 ? preference.actual_themes : themeFocus,
  );
  const recurringThemes = themeRanking
    .filter((item) => (themeStageCounts.get(item.value) ?? 0) > 1)
    .map((item) => labelFromCode(item.value));
  const onceOffThemes = themeRanking
    .filter((item) => (themeStageCounts.get(item.value) ?? 0) <= 1)
    .map((item) => labelFromCode(item.value));

  const customerCode = topSignal(preferences, "customer_type");
  const modelCode = topSignal(preferences, "business_model");
  const aiCode = topSignal(preferences, "ai_relevance");
  const customer = customerCode ? labelFromCode(customerCode) : null;
  const model = modelCode ? labelFromCode(modelCode) : null;
  const aiPhrase = aiCode
    ? (AI_PHRASES[aiCode.toLowerCase()] ?? labelFromCode(aiCode))
    : null;

  return {
    sectorRanking,
    strongSectors,
    moderateSectors,
    limitedSectors,
    recurringThemes,
    onceOffThemes,
    customerCode,
    modelCode,
    aiCode,
    customer,
    model,
    aiPhrase,
  };
}

export function buildCoreStageLabel(stages: StageBehaviour[]): string {
  const coreStages = stages.filter(
    (stage) => stage.conviction === "strongest" || stage.conviction === "active",
  );
  const coreStageLabels = coreStages.map((stage) => stage.stageLabel);
  return coreStageLabels.length > 1
    ? `${coreStageLabels[0]}–${coreStageLabels[coreStageLabels.length - 1]}`
    : (coreStageLabels[0] ?? stages[0].stageLabel);
}

export function buildStageNarrative(stages: StageBehaviour[]): string {
  const strongest = stages.find((stage) => stage.conviction === "strongest");
  const active = stages.filter((stage) => stage.conviction === "active");
  const outerStages = stages.filter(
    (stage) => stage.conviction === "selective" || stage.conviction === "opportunistic",
  );

  return [
    strongest
      ? `${strongest.stageLabel} is the clearest conviction stage, with ${strongest.leadCount} of ${strongest.dealsCount} observed rounds led.`
      : null,
    active.length > 0
      ? `${joinList(active.map((stage) => stage.stageLabel))} ${
          active.length === 1 ? "is" : "are"
        } also a regular entry point.`
      : null,
    outerStages.length > 0
      ? `${joinList(outerStages.map((stage) => stage.stageLabel))} ${
          outerStages.length === 1 ? "appears" : "appear"
        } more selective.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}
