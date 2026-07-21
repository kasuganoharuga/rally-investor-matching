import { ChevronRight, Mail, MapPin } from "lucide-react";

import {
  companyInitials,
  companyLocation,
  formatDate,
  labelFromCode,
} from "@/features/company-management/components/company-management-format";
import {
  companyProfileCompletion,
  managedCompanyStatus,
  type ManagedCompany,
  type ManagedCompanyStatus,
} from "@/features/company-management/types/company-management";
import { SectorTag } from "@/features/investors/components/sector-tag";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ManagedCompanyStatus, string> = {
  ready: "Ready to match",
  "needs-details": "Needs details",
  "no-match-profile": "No matching profile",
};

const STATUS_STYLES: Record<ManagedCompanyStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "needs-details": "border-amber-200 bg-amber-50 text-amber-800",
  "no-match-profile": "border-border bg-muted text-muted-foreground",
};

export function CompanyManagementListRow({
  company,
  selected,
  onSelect,
}: {
  company: ManagedCompany;
  selected: boolean;
  onSelect: () => void;
}) {
  const completion = companyProfileCompletion(company);
  const status = managedCompanyStatus(company);
  const matchingProfile = company.currentMatchingProfile;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "grid w-full min-w-0 gap-4 border-b border-border px-5 py-4 text-left transition last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_120px_20px] sm:items-center",
        selected && "bg-secondary/10 shadow-[inset_3px_0_0_var(--primary)]",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          {companyInitials(company.profile.name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-foreground">
              {company.profile.name}
            </p>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                STATUS_STYLES[status],
              )}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {company.profile.oneLiner ?? "No company summary provided"}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="size-3" aria-hidden="true" />
              {company.owner.email}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" />
              {companyLocation(company)}
            </span>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap gap-1.5">
          {matchingProfile?.stage ? (
            <span className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
              {labelFromCode(matchingProfile.stage)}
            </span>
          ) : null}
          {matchingProfile?.sectorPrimary ? (
            <SectorTag sector={matchingProfile.sectorPrimary} />
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {company.matchRunCount}{" "}
          {company.matchRunCount === 1 ? "match run" : "match runs"}
          {company.lastMatchedAt ? ` · ${formatDate(company.lastMatchedAt)}` : ""}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Profile</span>
          <span className="font-semibold text-foreground">{completion}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Updated {formatDate(company.profile.updatedAt)}
        </p>
      </div>

      <ChevronRight
        className="hidden size-4 text-muted-foreground sm:block"
        aria-hidden="true"
      />
    </button>
  );
}
