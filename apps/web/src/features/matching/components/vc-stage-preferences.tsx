import { CalendarRange, CircleDollarSign, Flag, Layers3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MatchStagePreference } from "@/features/matching/types/match";
import { SectorTag } from "@/features/investors/components/sector-tag";

import {
  formatChequeRange,
  formatDate,
  humanizeEvidenceText,
  labelFromCode,
  toNumber,
} from "./vc-detail-utils";

type VcStagePreferencesProps = {
  preferences: MatchStagePreference[];
};

export function VcStagePreferences({ preferences }: VcStagePreferencesProps) {
  const sorted = [...preferences].sort(
    (a, b) => (toNumber(b.deals_count) ?? 0) - (toNumber(a.deals_count) ?? 0),
  );

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-2">
          <Layers3 className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">
            Stage-specific evidence
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Observed behaviour is kept separate by round so early and later-stage activity
          is not blended.
        </p>
      </div>

      {sorted.length > 0 ? (
        <div>
          {sorted.slice(0, 8).map((preference) => {
            const dealsCount = toNumber(preference.deals_count) ?? 0;
            const leadCount = toNumber(preference.lead_count) ?? 0;
            const participantCount = toNumber(preference.participant_count) ?? 0;
            return (
              <article
                key={preference.stage ?? `stage-${dealsCount}`}
                className="border-b border-border px-6 py-5 last:border-b-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
                      {labelFromCode(preference.stage)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {dealsCount} observed {dealsCount === 1 ? "deal" : "deals"}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {labelFromCode(preference.data_quality)} evidence
                  </Badge>
                </div>

                <div className="mt-4 grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="flex gap-2">
                    <Flag
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Round role
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {leadCount} led, {participantCount} participated
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <CircleDollarSign
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Observed cheque
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {formatChequeRange(preference)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <CalendarRange
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Evidence window
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {formatDate(preference.deals_window_start)} to{" "}
                        {formatDate(preference.deals_window_end)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Investment sectors
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {preference.actual_sector.length > 0 ? (
                        preference.actual_sector
                          .slice(0, 6)
                          .map((sector) => <SectorTag key={sector} sector={sector} />)
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No sector evidence yet
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      Specific investment themes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {preference.actual_themes.length > 0 ? (
                        preference.actual_themes.slice(0, 8).map((theme) => (
                          <Badge key={theme} variant="secondary">
                            {labelFromCode(theme)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No specific direction evidence yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {preference.matching_notes ? (
                  <p className="mt-4 border-l-2 border-secondary pl-3 text-sm leading-6 text-muted-foreground">
                    {humanizeEvidenceText(preference.matching_notes)}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-muted-foreground">
          No stage-specific preference rows have been generated for this investor yet.
        </p>
      )}
    </section>
  );
}
