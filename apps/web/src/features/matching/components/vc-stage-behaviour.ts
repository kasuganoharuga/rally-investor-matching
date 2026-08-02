import type { MatchStagePreference } from "@/features/matching/types/match";

import type { StageBehaviour, StageConviction } from "./vc-behaviour-types";
import {
  formatDate,
  formatMoneyRange,
  humanizeEvidenceText,
  labelFromCode,
  toNumber,
} from "./vc-detail-utils";

const STAGE_ORDER = [
  "pre_seed",
  "seed",
  "bridge",
  "series_a",
  "series_b",
  "series_c_plus",
];

const CONVICTION_LABELS: Record<StageConviction, string> = {
  strongest: "Strongest conviction",
  active: "Active",
  selective: "Selective",
  opportunistic: "Opportunistic",
};

type StageRow = {
  stage: string;
  deals: number;
  leads: number;
  order: number;
  preference: MatchStagePreference;
};

function stageIndex(stage: string): number {
  const index = STAGE_ORDER.indexOf(stage.toLowerCase());
  return index === -1 ? STAGE_ORDER.length : index;
}

function roundSizeRange(preference: MatchStagePreference): string | null {
  return formatMoneyRange(
    toNumber(preference.cheque_size_min_usd),
    toNumber(preference.cheque_size_max_usd),
  );
}

function stageRows(preferences: MatchStagePreference[]): StageRow[] {
  return preferences
    .filter((preference) => Boolean(preference.stage))
    .map((preference) => ({
      stage: preference.stage as string,
      deals: toNumber(preference.deals_count) ?? 0,
      leads: toNumber(preference.lead_count) ?? 0,
      order: stageIndex(preference.stage as string),
      preference,
    }))
    .sort((a, b) => a.order - b.order);
}

function buildStageBehaviour(rows: StageRow[]): StageBehaviour[] {
  if (rows.length === 0) return [];

  const maxDeals = Math.max(...rows.map((row) => row.deals));
  const coreRows = rows.filter((row) => row.deals === maxDeals);
  const coreOrder = Math.min(...coreRows.map((row) => row.order));

  // The strongest-conviction stage is the core stage they lead most often;
  // ties break toward the later round, where rounds are larger.
  const convictionCandidate =
    maxDeals >= 2
      ? [...coreRows]
          .filter((row) => row.leads / Math.max(row.deals, 1) >= 0.5)
          .sort((a, b) => {
            const ratio = b.leads / b.deals - a.leads / a.deals;
            return ratio !== 0 ? ratio : b.order - a.order;
          })[0]
      : undefined;

  return rows.map((row) => {
    const leadShare = row.leads / Math.max(row.deals, 1);
    const roundSize = roundSizeRange(row.preference);
    const stageLabel = labelFromCode(row.stage);

    let conviction: StageConviction;
    if (convictionCandidate && row.stage === convictionCandidate.stage) {
      conviction = "strongest";
    } else if (row.deals >= maxDeals * 0.6) {
      conviction = "active";
    } else if (row.order > coreOrder) {
      conviction = "opportunistic";
    } else {
      conviction = "selective";
    }

    const sentences: Record<StageConviction, string> = {
      strongest:
        "The clearest repeat pattern. They led the observed rounds here, and those rounds were materially larger.",
      active:
        leadShare >= 0.5
          ? "A core entry stage where they are willing to lead."
          : "A core entry stage, entered as either lead or participant.",
      selective:
        row.leads > 0
          ? "Limited evidence, but willing to lead smaller rounds when conviction is strong."
          : "Limited evidence at this stage, and no observed lead role.",
      opportunistic:
        row.leads > 0
          ? "Occasional later-stage round outside the core pattern — they did take the lead here, but only once."
          : "Participates in selected later-stage companies, but the evidence does not suggest this is a primary entry point.",
    };

    const windowStart = formatDate(row.preference.deals_window_start);
    const windowEnd = formatDate(row.preference.deals_window_end);

    return {
      stage: row.stage,
      stageLabel,
      conviction,
      convictionLabel: CONVICTION_LABELS[conviction],
      sentence: sentences[conviction],
      dealsCount: row.deals,
      leadCount: row.leads,
      participantCount: toNumber(row.preference.participant_count) ?? 0,
      roundSizeLabel: roundSize ?? "No observed range",
      evidenceWindow:
        windowStart === windowEnd ? windowStart : `${windowStart} to ${windowEnd}`,
      dataQuality: labelFromCode(row.preference.data_quality),
      sectors: row.preference.actual_sector,
      themes: row.preference.actual_themes,
      notes: row.preference.matching_notes
        ? humanizeEvidenceText(row.preference.matching_notes)
        : null,
    };
  });
}

export type StageTotals = {
  rows: StageRow[];
  stages: StageBehaviour[];
  totalDeals: number;
  totalLeads: number;
};

export function buildStagesFromPreferences(
  preferences: MatchStagePreference[],
  totalDealsHint: number | null,
): StageTotals | null {
  const rows = stageRows(preferences);
  if (rows.length === 0) return null;

  const stages = buildStageBehaviour(rows);
  const totalDeals = totalDealsHint ?? rows.reduce((sum, row) => sum + row.deals, 0);
  const totalLeads = rows.reduce((sum, row) => sum + row.leads, 0);

  return { rows, stages, totalDeals, totalLeads };
}
