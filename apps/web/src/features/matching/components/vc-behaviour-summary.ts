import type { MatchStagePreference } from "@/features/matching/types/match";

import { joinList } from "./vc-behaviour-signals";
import type { RankedSignals } from "./vc-behaviour-ranked-signals";
import type {
  BehaviourMetric,
  BehaviourProfile,
  StageBehaviour,
} from "./vc-behaviour-types";
import { formatMoneyRange, proseFromCode, toNumber } from "./vc-detail-utils";

function roleLabelForRatio(leadRatio: number): string {
  if (leadRatio >= 0.6) return "Usually leads";
  if (leadRatio <= 0.3) return "Usually participates";
  return "Leads or participates";
}

export function buildProfileSummary(input: {
  stages: StageBehaviour[];
  coreEntry: string;
  leadRatio: number;
  totalDeals: number;
  totalLeads: number;
  stageCount: number;
  preferences: MatchStagePreference[];
  signals: RankedSignals;
}): Pick<BehaviourProfile, "headline" | "chips" | "metrics"> {
  const { stages, coreEntry, leadRatio, totalDeals, totalLeads, signals } = input;
  const { strongSectors, customer, model, modelCode, aiPhrase } = signals;

  const posture =
    leadRatio >= 0.6
      ? "Lead-oriented"
      : leadRatio <= 0.3
        ? "Follow-oriented"
        : "Mixed-role";

  const evidenceParts = [
    ...strongSectors.slice(0, 2).map((item) => proseFromCode(item.value)),
    model ? proseFromCode(modelCode as string) : null,
    aiPhrase && aiPhrase !== "None" ? `${aiPhrase} software` : null,
  ].filter((value): value is string => Boolean(value));

  const read = [
    posture,
    "investor",
    `primarily entering at ${coreEntry}`,
    evidenceParts.length > 0
      ? `, with the strongest evidence in ${joinList(evidenceParts.slice(0, 3))}`
      : "",
  ]
    .join(" ")
    .replace(" ,", ",")
    .concat(".");
  // Below three deals the pattern is a hint, not a read — say so up front
  // rather than letting the confidence note downstairs contradict the headline.
  const headline =
    totalDeals < 3
      ? `On limited evidence: ${read.charAt(0).toLowerCase()}${read.slice(1)}`
      : read;

  const roleLabel = roleLabelForRatio(leadRatio);
  const leadConfidence = totalDeals >= 5 ? "High" : totalDeals >= 3 ? "Medium" : "Low";

  // Behaviour only. The stage already appears in the headline and in the core
  // facts below — a third copy as a chip was pure repetition.
  const chips = [
    roleLabel,
    customer ? `${customer} focus` : null,
    aiPhrase && aiPhrase !== "None" ? `${aiPhrase} focus` : null,
  ].filter((value): value is string => Boolean(value));

  const coreStages = stages.filter(
    (stage) => stage.conviction === "strongest" || stage.conviction === "active",
  );
  // NOTE: `cheque_size_*_usd` is a misnomer inherited from the schema — the
  // values are the TOTAL size of the rounds this investor appeared in, not
  // the amount they personally put in. Everything user-facing says "round
  // size" so a founder doesn't read it as this investor's cheque capacity.
  //
  // Deliberately not a global min/max: mixing Pre-Seed with Series C makes a
  // range that is technically true and practically useless.
  const coreRoundSize =
    coreStages.length > 0
      ? coreStages
          .map((stage) => `${stage.stageLabel}: ${stage.roundSizeLabel}`)
          .join(" · ")
      : "No observed range";

  const allMins = input.preferences
    .map((preference) => toNumber(preference.cheque_size_min_usd))
    .filter((value): value is number => value !== null);
  const allMaxes = input.preferences
    .map((preference) => toNumber(preference.cheque_size_max_usd))
    .filter((value): value is number => value !== null);
  const overallRoundSize =
    allMins.length > 0 && allMaxes.length > 0
      ? `${formatMoneyRange(Math.min(...allMins), Math.max(...allMaxes))} across all stages`
      : undefined;

  // "Enterprise subscription SaaS" reads faster than separate customer and
  // model rows.
  const primaryFit =
    [customer, model ? proseFromCode(modelCode as string) : null]
      .filter(Boolean)
      .join(" ") || null;

  const metrics: BehaviourMetric[] = [
    { label: "Core stage", value: coreEntry },
    {
      label: "Typical role",
      value: roleLabel,
      // Confidence sits next to the judgement it qualifies, not as an
      // abstract page-level percentage nobody can interpret.
      note: `${totalLeads} of ${totalDeals} reviewed deals · ${leadConfidence} confidence`,
    },
    {
      label: "Core round size",
      value: coreRoundSize,
      note: overallRoundSize
        ? `Total round size, not this investor's share · ${overallRoundSize}`
        : "Total round size, not this investor's share",
    },
    ...(primaryFit
      ? [{ label: "Primary fit", value: primaryFit } as BehaviourMetric]
      : []),
    {
      label: "Evidence",
      value: `${totalDeals} reviewed ${totalDeals === 1 ? "deal" : "deals"}`,
      note: `${input.stageCount} ${input.stageCount === 1 ? "stage" : "stages"} observed`,
    },
  ];

  return { headline, chips, metrics };
}
