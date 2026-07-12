"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  InvestorDetailError,
  InvestorDetailLoading,
  InvestorDetailNotFound,
} from "@/features/investors/components/investor-detail-states";
import { InvestorDetailDeals } from "@/features/investors/components/investor-detail-deals";
import { InvestorDetailFocus } from "@/features/investors/components/investor-detail-focus";
import { InvestorDetailHeader } from "@/features/investors/components/investor-detail-header";
import { InvestorDetailMore } from "@/features/investors/components/investor-detail-more";
import { InvestorDetailSidebar } from "@/features/investors/components/investor-detail-sidebar";
import { useInvestorDetail } from "@/features/investors/hooks/use-investor-detail";
import type { InvestorDetail } from "@/features/investors/types/investor";

type InvestorDetailPanelProps = {
  slug: string;
};

function InvestorDetailContent({ investor }: { investor: InvestorDetail }) {
  return (
    <div className="space-y-5">
      <Link
        href="/investors"
        className="-ml-2 inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to directory
      </Link>

      <InvestorDetailHeader investor={investor} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <InvestorDetailFocus investor={investor} />
          <InvestorDetailDeals investor={investor} />
          <InvestorDetailMore investor={investor} />
        </div>

        <InvestorDetailSidebar investor={investor} />
      </div>
    </div>
  );
}

export function InvestorDetailPanel({ slug }: InvestorDetailPanelProps) {
  const { investor, isLoading, error, notFound, reload } = useInvestorDetail(slug);

  if (isLoading) {
    return <InvestorDetailLoading />;
  }

  if (notFound) {
    return <InvestorDetailNotFound />;
  }

  if (error) {
    return <InvestorDetailError message={error.message} onRetry={reload} />;
  }

  if (!investor) {
    return <InvestorDetailNotFound />;
  }

  return <InvestorDetailContent investor={investor} />;
}
