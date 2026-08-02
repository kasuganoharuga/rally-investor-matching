import { Badge } from "@/components/ui/badge";
import { SectorTag } from "@/features/investors/components/sector-tag";

import type { StageBehaviour } from "./vc-behaviour-profile";
import { labelFromCode } from "./vc-detail-utils";

export function VcStageRowDetail({
  stage,
  onViewDeals,
}: {
  stage: StageBehaviour;
  onViewDeals?: (stage: string) => void;
}) {
  return (
    <div className="bg-muted/25 px-5 py-4">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        {stage.sentence}
      </p>

      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase text-muted-foreground/70">
            Round role
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {stage.leadCount} led, {stage.participantCount} participated
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-muted-foreground/70">
            Evidence window
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {stage.evidenceWindow}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-muted-foreground/70">
            Data quality
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {stage.dataQuality}
          </dd>
        </div>
      </dl>

      {stage.sectors.length > 0 || stage.themes.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {stage.sectors.map((sector) => (
            <SectorTag key={sector} sector={sector} />
          ))}
          {stage.themes.slice(0, 4).map((theme) => (
            <Badge key={theme} variant="outline">
              {labelFromCode(theme)}
            </Badge>
          ))}
        </div>
      ) : null}

      {onViewDeals ? (
        <button
          type="button"
          onClick={() => onViewDeals(stage.stage)}
          className="mt-4 text-sm font-semibold text-primary transition hover:underline"
        >
          See the {stage.dealsCount} {stage.dealsCount === 1 ? "deal" : "deals"} behind{" "}
          {stage.stageLabel} →
        </button>
      ) : null}
    </div>
  );
}
