import {
  labelFromCode,
  raiseRange,
} from "@/features/company-management/components/company-management-format";
import type { ManagedCompany } from "@/features/company-management/types/company-management";
import { SectorTag } from "@/features/investors/components/sector-tag";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function CompanyManagementMatchingSection({
  company,
}: {
  company: ManagedCompany;
}) {
  const matching = company.currentMatchingProfile;

  return (
    <section className="border-b border-border p-5">
      <h3 className="text-sm font-semibold text-foreground">
        Current matching profile
      </h3>
      {matching ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {matching.stage ? (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {labelFromCode(matching.stage)}
              </span>
            ) : null}
            {matching.sectorPrimary ? (
              <SectorTag sector={matching.sectorPrimary} />
            ) : null}
            {matching.useCasePrimary ? (
              <span className="rounded-full border border-secondary bg-secondary/20 px-2.5 py-1 text-xs text-primary">
                {labelFromCode(matching.useCasePrimary)}
              </span>
            ) : null}
          </div>
          <dl className="space-y-3">
            <DetailRow label="Raise" value={raiseRange(company)} />
            <DetailRow label="Customer" value={labelFromCode(matching.customerType)} />
            <DetailRow
              label="Business model"
              value={labelFromCode(matching.businessModel)}
            />
            <DetailRow
              label="Target markets"
              value={
                matching.targetGeographies.map(labelFromCode).join(", ") ||
                "Not specified"
              }
            />
          </dl>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No current fundraising profile is available.
        </p>
      )}
    </section>
  );
}
