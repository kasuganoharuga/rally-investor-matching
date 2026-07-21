import { Building2, FileText, History, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CompanyManagementFounderSection } from "@/features/company-management/components/company-management-founder-section";
import {
  companyInitials,
  formatDate,
} from "@/features/company-management/components/company-management-format";
import { CompanyManagementMatchingSection } from "@/features/company-management/components/company-management-matching-section";
import {
  companyProfileCompletion,
  managedCompanyStatus,
  type ManagedCompany,
} from "@/features/company-management/types/company-management";

export function CompanyManagementDetail({
  company,
  onEdit,
}: {
  company: ManagedCompany | null;
  onEdit: () => void;
}) {
  if (!company) {
    return (
      <aside className="rounded-lg border border-dashed border-border bg-card p-8 text-center lg:sticky lg:top-6">
        <Building2
          className="mx-auto size-7 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="mt-3 font-semibold text-foreground">Select a company</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a company to review its profile and activity.
        </p>
      </aside>
    );
  }

  const completion = companyProfileCompletion(company);
  const status = managedCompanyStatus(company);

  return (
    <aside className="overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:sticky lg:top-6">
      <div className="border-b border-border p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            {companyInitials(company.profile.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-foreground">
              {company.profile.name}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {company.profile.oneLiner ?? "No company summary provided"}
            </p>
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          Edit company profile
        </Button>
      </div>

      <section className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Profile readiness</h3>
          <span className="text-sm font-semibold text-foreground">{completion}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {status === "ready"
            ? "Company and current raise signals are ready for matching."
            : status === "needs-details"
              ? "Add more company details to improve review quality."
              : "The company has no current matching profile yet."}
        </p>
      </section>

      <CompanyManagementFounderSection company={company} />
      <CompanyManagementMatchingSection company={company} />

      <section className="grid grid-cols-2 divide-x divide-border">
        <div className="p-5">
          <FileText className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 text-xl font-semibold text-foreground">
            {company.documentCount}
          </p>
          <p className="text-xs text-muted-foreground">Documents</p>
        </div>
        <div className="p-5">
          <History className="size-4 text-primary" aria-hidden="true" />
          <p className="mt-2 text-xl font-semibold text-foreground">
            {company.matchRunCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {company.lastMatchedAt
              ? `Last ${formatDate(company.lastMatchedAt)}`
              : "No match runs"}
          </p>
        </div>
      </section>
    </aside>
  );
}
