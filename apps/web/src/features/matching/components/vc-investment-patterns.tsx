import { Info } from "lucide-react";

import type { MatchStagePreference } from "@/features/matching/types/match";

import type { BehaviourProfile } from "./vc-behaviour-profile";
import {
  humanizeEvidenceText,
  labelFromCode,
  weightedSignals,
} from "./vc-detail-utils";
import { VcSectorTier } from "./vc-sector-tier";
import { VcSignalDistribution } from "./vc-signal-distribution";

/**
 * One card for everything the deal table can't show directly: how the sectors
 * rank against each other, and the proportions behind the snapshot's claims.
 *
 * There is deliberately no flat "every observed sector" list. The tiers below
 * already cover every sector exactly once, ranked — the flat version repeated
 * most of them without the ranking.
 */

export type PatternsApproach = {
  aiAppetite: string;
  preferredChannel: string;
  entryChannels: string[];
};

export function VcInvestmentPatterns({
  profile,
  preferences,
  approach,
  activitySummary,
  screeningNotes,
}: {
  profile: BehaviourProfile;
  preferences: MatchStagePreference[];
  approach?: PatternsApproach;
  activitySummary?: string | null;
  screeningNotes?: string | null;
}) {
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
  const sourceNote = humanizeEvidenceText(activitySummary ?? screeningNotes);

  // Only fields that actually carry a value — two rows of "Not specified"
  // is noise, and lead behaviour already headlines the snapshot.
  const approachFacts = approach
    ? [
        { label: "AI appetite", value: approach.aiAppetite },
        { label: "Preferred channel", value: approach.preferredChannel },
        {
          label: "Entry channels",
          value:
            approach.entryChannels.length > 0
              ? approach.entryChannels.map(labelFromCode).join(", ")
              : "Not specified",
        },
      ].filter(
        (fact) =>
          fact.value && fact.value !== "Not specified" && fact.value !== "Not listed",
      )
    : [];

  return (
    <section className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="grid gap-6 sm:grid-cols-3">
        <VcSectorTier title="Strong repeat" values={profile.sectorTiers.strong} />
        <VcSectorTier title="Also backed" values={profile.sectorTiers.moderate} />
        <VcSectorTier
          title="Limited evidence"
          note="No repeat deals here — missing evidence, not an exclusion."
          values={profile.sectorTiers.limited}
        />
      </div>

      {profile.recurringThemes.length > 0 || profile.onceOffThemes.length > 0 ? (
        <div className="space-y-3 border-t border-border pt-6">
          {profile.recurringThemes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground/70">
                Themes seen at more than one stage
              </p>
              <p className="mt-1.5 text-sm leading-6 text-foreground">
                {profile.recurringThemes.join(" · ")}
              </p>
            </div>
          ) : null}
          {profile.onceOffThemes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground/70">
                Seen once ({profile.onceOffThemes.length})
              </p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {profile.onceOffThemes.join(" · ")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasDistributions ? (
        <div className="grid gap-6 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {distributions.map((distribution) => (
            <VcSignalDistribution key={distribution.title} {...distribution} />
          ))}
        </div>
      ) : null}

      {approachFacts.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-4">
          {approachFacts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground/70">
                {fact.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{fact.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-3 border-t border-border pt-6">
        {profile.confidence.map((line) => (
          <div key={line} className="flex gap-2">
            <Info
              className="mt-1 size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-xs leading-6 text-muted-foreground">{line}</p>
          </div>
        ))}

        {sourceNote ? (
          <details>
            <summary className="cursor-pointer list-none text-xs font-semibold text-primary transition hover:underline">
              How this was calculated
            </summary>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{sourceNote}</p>
          </details>
        ) : null}
      </div>
    </section>
  );
}
