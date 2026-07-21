import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";

import { InvestorManagementEvidence } from "@/features/investor-management/components/investor-management-evidence";
import {
  formatDate,
  initials,
  investorLocation,
  investorTypeLabel,
  titleCase,
} from "@/features/investor-management/components/investor-management-format";
import { InvestorManagementReviewActions } from "@/features/investor-management/components/investor-management-review-actions";
import { InvestorReviewBadge } from "@/features/investor-management/components/investor-review-badge";
import type {
  ManagedInvestor,
  UpdateInvestorReviewInput,
} from "@/features/investor-management/types/investor-management";
import type { ApiError } from "@/lib/api/errors";

type ReviewResult = { data: ManagedInvestor | null; error: ApiError | null };

export function InvestorManagementDetail({
  investor,
  onReview,
}: {
  investor: ManagedInvestor | null;
  onReview: (id: string, input: UpdateInvestorReviewInput) => Promise<ReviewResult>;
}) {
  if (!investor) return null;

  return (
    <aside
      id="investor-review-detail"
      className="order-1 min-w-0 space-y-4 rounded-lg border bg-card p-4 shadow-sm lg:order-2 lg:sticky lg:top-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
          {initials(investor.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{investor.name}</h2>
            <InvestorReviewBadge status={investor.reviewStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {investorTypeLabel(investor.investorType)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {investorLocation(investor)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/investors/${investor.slug}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          View profile <ExternalLink className="size-4" />
        </Link>
        {investor.websiteUrl ? (
          <a
            href={investor.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-muted"
          >
            Website <ExternalLink className="size-4" />
          </a>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-md border text-sm text-muted-foreground">
            No website
          </span>
        )}
      </div>

      <InvestorManagementReviewActions
        key={investor.id}
        investor={investor}
        onReview={onReview}
      />
      <InvestorManagementEvidence investor={investor} />

      <section className="border-t pt-4 text-sm">
        <h3 className="font-semibold">Review record</h3>
        <dl className="mt-2 space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Data quality</dt>
            <dd className="font-semibold">{titleCase(investor.dataQuality)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Last reviewed</dt>
            <dd className="text-right font-semibold">
              {formatDate(investor.lastReviewedAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Reviewer</dt>
            <dd className="text-right font-semibold">
              {investor.reviewerName ?? "Not assigned"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Audit entries</dt>
            <dd className="font-semibold">{investor.reviewHistoryCount}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
}
