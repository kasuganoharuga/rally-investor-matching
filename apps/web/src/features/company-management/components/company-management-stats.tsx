import { Building2, CircleCheck, FileText, History } from "lucide-react";

import {
  managedCompanyStatus,
  type ManagedCompany,
} from "@/features/company-management/types/company-management";

export function CompanyManagementStats({ items }: { items: ManagedCompany[] }) {
  const ready = items.filter((item) => managedCompanyStatus(item) === "ready").length;
  const documents = items.reduce((total, item) => total + item.documentCount, 0);
  const runs = items.reduce((total, item) => total + item.matchRunCount, 0);
  const stats = [
    {
      label: "Companies",
      value: items.length,
      detail: "Active founder profiles",
      icon: Building2,
    },
    {
      label: "Ready to match",
      value: ready,
      detail: "Profile and raise signals ready",
      icon: CircleCheck,
    },
    {
      label: "Documents",
      value: documents,
      detail: "Files attached to companies",
      icon: FileText,
    },
    {
      label: "Matching runs",
      value: runs,
      detail: "Runs across all companies",
      icon: History,
    },
  ];

  return (
    <section
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Company metrics"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {stat.label}
            </p>
            <stat.icon className="size-4 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
        </div>
      ))}
    </section>
  );
}
