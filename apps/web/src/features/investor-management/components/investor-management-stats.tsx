import { CheckCircle2, Database, FileWarning, SearchCheck } from "lucide-react";

import type { ManagedInvestor } from "@/features/investor-management/types/investor-management";

export function InvestorManagementStats({ items }: { items: ManagedInvestor[] }) {
  const needsReview = items.filter((item) => item.reviewStatus === "unreviewed").length;
  const needsData = items.filter(
    (item) => item.reviewStatus === "needs_more_data",
  ).length;
  const reviewed = items.filter((item) =>
    ["approved", "corrected"].includes(item.reviewStatus),
  ).length;
  const stats = [
    {
      label: "Investors",
      value: items.length,
      note: "Active database records",
      icon: Database,
    },
    {
      label: "Needs review",
      value: needsReview,
      note: "Awaiting human review",
      icon: SearchCheck,
    },
    {
      label: "Needs more data",
      value: needsData,
      note: "Evidence gaps flagged",
      icon: FileWarning,
    },
    {
      label: "Reviewed",
      value: reviewed,
      note: "Approved or corrected",
      icon: CheckCircle2,
    },
  ];

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Investor review metrics"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {stat.label}
            </p>
            <stat.icon className="size-4 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
        </div>
      ))}
    </div>
  );
}
