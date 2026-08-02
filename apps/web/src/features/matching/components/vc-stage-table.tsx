"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

import type { BehaviourProfile, StageBehaviour } from "./vc-behaviour-profile";
import { normalizeStageCode } from "./vc-detail-utils";
import { VcStageRowDetail } from "./vc-stage-row-detail";

const CONVICTION_STYLES: Record<StageBehaviour["conviction"], string> = {
  strongest: "border-primary bg-primary text-primary-foreground",
  active: "border-secondary bg-secondary text-secondary-foreground",
  selective: "border-border bg-muted text-muted-foreground",
  opportunistic: "border-border bg-muted text-muted-foreground",
};

function roleSummary(stage: StageBehaviour): string {
  if (stage.leadCount === 0) return "Participated";
  if (stage.participantCount === 0) {
    return stage.leadCount === stage.dealsCount && stage.dealsCount > 1
      ? "Led both"
      : "Led";
  }
  return "Lead / participant";
}

/**
 * The overview needs the shape of the stage pattern at a glance, not five
 * full cards. Rows start closed; the detail is the same data the dedicated
 * stage tab shows, just reachable without leaving the overview.
 */
export function VcStageTable({
  profile,
  onViewDeals,
  matchedStage,
}: {
  profile: BehaviourProfile;
  onViewDeals?: (stage: string) => void;
  /** The founder's own stage, from this match's context — highlighted and pre-opened. */
  matchedStage?: string | null;
}) {
  const normalizedMatch = normalizeStageCode(matchedStage);
  const [openStage, setOpenStage] = useState<string | null>(
    normalizedMatch
      ? (profile.stages.find(
          (stage) => normalizeStageCode(stage.stage) === normalizedMatch,
        )?.stage ?? null)
      : null,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/55 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">
                Stage
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Behaviour
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Deals
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Role
              </th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                Round size
              </th>
            </tr>
          </thead>
          <tbody>
            {profile.stages.map((stage) => {
              const isOpen = openStage === stage.stage;
              const isMatched =
                normalizedMatch !== "" &&
                normalizeStageCode(stage.stage) === normalizedMatch;
              return [
                <tr
                  key={stage.stage}
                  className={cn(
                    "cursor-pointer border-t border-border transition hover:bg-muted/40",
                    isMatched && "bg-secondary/15",
                  )}
                  onClick={() => setOpenStage(isOpen ? null : stage.stage)}
                >
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="inline-flex items-center gap-1.5 font-semibold text-foreground"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 text-muted-foreground transition",
                          isOpen && "rotate-90",
                        )}
                        aria-hidden="true"
                      />
                      {stage.stageLabel}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          CONVICTION_STYLES[stage.conviction],
                        )}
                      >
                        {stage.convictionLabel}
                      </span>
                      {isMatched ? (
                        <span className="inline-flex rounded-full border border-secondary bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          Your stage
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {stage.dealsCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {roleSummary(stage)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium whitespace-nowrap text-foreground">
                    {stage.roundSizeLabel}
                  </td>
                </tr>,
                isOpen ? (
                  <tr key={`${stage.stage}-detail`} className="border-t border-border">
                    <td colSpan={5} className="p-0">
                      <VcStageRowDetail stage={stage} onViewDeals={onViewDeals} />
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
