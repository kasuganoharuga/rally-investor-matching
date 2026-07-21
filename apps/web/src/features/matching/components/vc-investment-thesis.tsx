import { Target } from "lucide-react";

import type { MatchStagePreference } from "@/features/matching/types/match";
import { SectorTag } from "@/features/investors/components/sector-tag";

import {
  humanizeEvidenceText,
  labelFromCode,
  uniqueValues,
  weightedSignals,
  type WeightedSignal,
} from "./vc-detail-utils";
import { ProfileTag } from "./vc-profile-primitives";

function SignalDistribution({
  title,
  signals,
}: {
  title: string;
  signals: WeightedSignal[];
}) {
  if (signals.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <div className="mt-3 space-y-2.5">
        {signals.map((signal) => (
          <div key={signal.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-foreground">
                {labelFromCode(signal.label)}
              </span>
              <span className="text-muted-foreground">
                {Math.round(signal.value * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(signal.value * 100, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type VcInvestmentThesisProps = {
  activitySummary?: string | null;
  screeningNotes?: string | null;
  sectorFocus: string[];
  themeFocus: string[];
  preferences: MatchStagePreference[];
};

export function VcInvestmentThesis({
  activitySummary,
  screeningNotes,
  sectorFocus,
  themeFocus,
  preferences,
}: VcInvestmentThesisProps) {
  const sectors = uniqueValues([
    ...sectorFocus,
    ...preferences.flatMap((preference) => preference.actual_sector),
  ]);
  const themes = uniqueValues([
    ...themeFocus,
    ...preferences.flatMap((preference) => preference.actual_themes),
  ]);
  const distributions = [
    {
      title: "Customer / ICP",
      signals: weightedSignals(preferences, "customer_type", 4),
    },
    {
      title: "Business model",
      signals: weightedSignals(preferences, "business_model", 4),
    },
    { title: "AI relevance", signals: weightedSignals(preferences, "ai_relevance", 4) },
    {
      title: "Geography evidence",
      signals: weightedSignals(preferences, "geography", 4),
    },
  ];
  const hasDistributions = distributions.some(
    (distribution) => distribution.signals.length > 0,
  );

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Target className="size-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">
          Observed investment thesis
        </h2>
      </div>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
        {humanizeEvidenceText(
          activitySummary ??
            screeningNotes ??
            "This profile is derived from observed investment activity in the formal deal dataset.",
        )}
      </p>

      <div className="mt-5 grid gap-6 border-t border-border pt-5 xl:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Investment sectors
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sectors.length > 0 ? (
              sectors
                .slice(0, 12)
                .map((sector) => <SectorTag key={sector} sector={sector} />)
            ) : (
              <span className="text-sm text-muted-foreground">
                No sector evidence available
              </span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Specific investment themes
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.length > 0 ? (
              themes.slice(0, 16).map((theme) => (
                <ProfileTag key={theme} accent>
                  {labelFromCode(theme)}
                </ProfileTag>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No direction evidence available
              </span>
            )}
          </div>
        </div>
      </div>

      {hasDistributions ? (
        <div className="mt-6 grid gap-6 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {distributions.map((distribution) => (
            <SignalDistribution key={distribution.title} {...distribution} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
