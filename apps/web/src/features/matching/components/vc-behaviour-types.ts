export type StageConviction = "strongest" | "active" | "selective" | "opportunistic";

export type StageBehaviour = {
  stage: string;
  stageLabel: string;
  conviction: StageConviction;
  convictionLabel: string;
  sentence: string;
  dealsCount: number;
  leadCount: number;
  participantCount: number;
  roundSizeLabel: string;
  /** Raw per-stage fields the conviction line doesn't already state. */
  evidenceWindow: string;
  dataQuality: string;
  sectors: string[];
  themes: string[];
  notes: string | null;
};

export type BehaviourMetric = {
  label: string;
  value: string;
  note?: string;
};

export type BehaviourProfile = {
  headline: string;
  chips: string[];
  metrics: BehaviourMetric[];
  stages: StageBehaviour[];
  stageNarrative: string;
  strongestThemes: string[];
  /** Every observed sector, each in exactly one tier. */
  sectorTiers: { strong: string[]; moderate: string[]; limited: string[] };
  recurringThemes: string[];
  onceOffThemes: string[];
  bestFit: string[];
  lessProven: string[];
  confidence: string[];
};
