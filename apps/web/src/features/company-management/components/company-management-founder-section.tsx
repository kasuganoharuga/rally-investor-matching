import { ExternalLink, Mail, MapPin, UserRound } from "lucide-react";

import {
  companyLocation,
  labelFromCode,
} from "@/features/company-management/components/company-management-format";
import type { ManagedCompany } from "@/features/company-management/types/company-management";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function CompanyManagementFounderSection({
  company,
}: {
  company: ManagedCompany;
}) {
  return (
    <section className="border-b border-border p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserRound className="size-4" aria-hidden="true" />
        Founder and company
      </h3>
      <div className="mt-4 space-y-3 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{company.owner.email}</span>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {companyLocation(company)}
        </p>
        <dl className="space-y-3 pt-1">
          <DetailRow label="Founder" value={company.owner.name || "Not specified"} />
          <DetailRow label="Role" value={labelFromCode(company.owner.roleAtCompany)} />
          <DetailRow
            label="Founded"
            value={company.profile.foundedYear?.toString() ?? "Not specified"}
          />
        </dl>
        {company.profile.websiteUrl ? (
          <a
            href={company.profile.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            Visit website <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
