import type { MatchStagePreference } from "@/features/matching/types/match";

import { buildFitConclusions } from "./vc-behaviour-fit";
import {
  buildCoreStageLabel,
  buildStageNarrative,
  rankBehaviourSignals,
} from "./vc-behaviour-ranked-signals";
import { buildProfileSummary } from "./vc-behaviour-summary";
import type { BehaviourProfile } from "./vc-behaviour-types";
import { buildStagesFromPreferences } from "./vc-stage-behaviour";

export type {
  BehaviourMetric,
  BehaviourProfile,
  StageBehaviour,
  StageConviction,
} from "./vc-behaviour-types";

/**
 * Derives the conclusions the profile page leads with. Everything here is a
 * reading of the stage-preference rows — the rows themselves stay on the page
 * underneath so a reader can check the call.
 *
 * Deliberately never says an investor "avoids" anything: absence of a deal is
 * absence of evidence, not a stated refusal. The weakest tier is always
 * "limited evidence".
 */
export function buildBehaviourProfile(input: {
  preferences: MatchStagePreference[];
  sectorFocus: string[];
  themeFocus: string[];
  leadRatio: number | null;
  totalDeals: number | null;
  dataQuality: string | null;
}): BehaviourProfile | null {
  const { preferences, sectorFocus, themeFocus } = input;
  const stageTotals = buildStagesFromPreferences(preferences, input.totalDeals);
  if (!stageTotals) return null;

  const { rows, stages, totalDeals, totalLeads } = stageTotals;
  const leadRatio = input.leadRatio ?? (totalDeals > 0 ? totalLeads / totalDeals : 0);
  const coreEntry = buildCoreStageLabel(stages);
  const signals = rankBehaviourSignals(preferences, sectorFocus, themeFocus);

  // Geography is deliberately absent from every conclusion below. The whole
  // deal corpus is ANZ, so "ANZ investor" is true of every row and separates
  // nothing — it reads as a differentiator while carrying no information. The
  // raw geography distribution still ships in the evidence tab.
  const summary = buildProfileSummary({
    stages,
    coreEntry,
    leadRatio,
    totalDeals,
    totalLeads,
    stageCount: rows.length,
    preferences,
    signals,
  });
  const fit = buildFitConclusions({
    preferences,
    stages,
    coreEntry,
    leadRatio,
    totalDeals,
    dataQuality: input.dataQuality,
    signals,
  });

  return {
    ...summary,
    stages,
    stageNarrative: buildStageNarrative(stages),
    ...fit,
  };
}
