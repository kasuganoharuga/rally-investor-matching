import { Check, Minus } from "lucide-react";

import {
  chequeLabel,
  confidencePercent,
  titleCase,
} from "@/features/investor-management/components/investor-management-format";
import {
  investorEvidenceCompletion,
  investorSectors,
  investorThemes,
  type ManagedInvestor,
} from "@/features/investor-management/types/investor-management";
import { SectorTag } from "@/features/investors/components/sector-tag";

function EvidenceCheck({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {ready ? (
        <Check className="size-4 text-emerald-700" aria-label="Available" />
      ) : (
        <Minus className="size-4 text-amber-700" aria-label="Missing" />
      )}
    </div>
  );
}

export function InvestorManagementEvidence({
  investor,
}: {
  investor: ManagedInvestor;
}) {
  const sectors = investorSectors(investor);
  const themes = investorThemes(investor);
  const completion = investorEvidenceCompletion(investor);

  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between text-sm">
          <h3 className="font-semibold">Evidence readiness</h3>
          <span className="font-semibold">{completion}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
        </div>
        <div className="mt-3 grid gap-x-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <EvidenceCheck label="Website" ready={Boolean(investor.websiteUrl)} />
          <EvidenceCheck label="HQ location" ready={Boolean(investor.hqCountry)} />
          <EvidenceCheck label="Linked sources" ready={investor.sourceCount > 0} />
          <EvidenceCheck label="Core-stage deals" ready={investor.totalDealsUsed > 0} />
          <EvidenceCheck label="Stage preferences" ready={investor.stages.length > 0} />
          <EvidenceCheck label="Sector evidence" ready={sectors.length > 0} />
        </div>
      </section>

      <section className="border-t pt-4">
        <h3 className="text-sm font-semibold">Observed stage evidence</h3>
        {investor.stages.length > 0 ? (
          <div className="mt-3 space-y-2">
            {investor.stages.slice(0, 5).map((stage) => (
              <div key={stage.stage} className="rounded-md border bg-muted/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{titleCase(stage.stage)}</span>
                  <span className="text-xs text-muted-foreground">
                    {stage.dealsCount} deals · {titleCase(stage.dataQuality)} evidence
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stage.leadCount} led · {stage.participantCount} participated ·{" "}
                  {chequeLabel(stage.chequeSizeMinUsd, stage.chequeSizeMaxUsd)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-amber-800">
            No core-stage preference has been generated.
          </p>
        )}
      </section>

      <section className="border-t pt-4">
        <h3 className="text-sm font-semibold">Observed investment sectors</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {sectors.length > 0 ? (
            sectors
              .slice(0, 8)
              .map((sector) => <SectorTag key={sector} sector={sector} />)
          ) : (
            <span className="text-sm text-muted-foreground">No sector evidence</span>
          )}
        </div>
        {themes.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.slice(0, 8).map((theme) => (
              <span
                key={theme}
                className="rounded-full border bg-muted px-2.5 py-1 text-xs"
              >
                {titleCase(theme)}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
        <div>
          <p className="text-xl font-semibold">
            {confidencePercent(investor.overallConfidence)}%
          </p>
          <p className="text-xs text-muted-foreground">Confidence</p>
        </div>
        <div>
          <p className="text-xl font-semibold">{investor.dealCount}</p>
          <p className="text-xs text-muted-foreground">Linked deals</p>
        </div>
        <div>
          <p className="text-xl font-semibold">{investor.sourceCount}</p>
          <p className="text-xs text-muted-foreground">Sources</p>
        </div>
      </section>
    </div>
  );
}
