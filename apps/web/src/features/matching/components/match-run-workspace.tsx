"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { MatchDetailPanel } from "@/features/matching/components/match-detail-panel";
import { MatchResultsScreen } from "@/features/matching/components/match-results-screen";
import { WorkspaceSubnav } from "@/features/matching/components/workspace-subnav";
import { useMatchingRun } from "@/features/matching/hooks/use-matching-run";
import { cn } from "@/lib/utils";

function MatchRunLoading() {
  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-4 px-6 py-5">
      <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />
      <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
    </section>
  );
}

function MatchRunNotFound() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-5">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm font-medium text-foreground">Match not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This match may have been removed, or the link is out of date.
        </p>
        <Link href="/match" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
          Start a new match
        </Link>
      </div>
    </section>
  );
}

function MatchRunError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-5">
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
        <p className="text-sm font-medium text-destructive">
          Unable to load this match
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          Retry
        </Button>
      </div>
    </section>
  );
}

export function MatchRunWorkspace({ runId }: { runId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { record, isLoading, error, notFound, reload } = useMatchingRun(runId);
  const selectedInvestorId = searchParams.get("investor");

  function renderContent() {
    if (isLoading) {
      return <MatchRunLoading />;
    }
    if (notFound) {
      return <MatchRunNotFound />;
    }
    if (error || !record) {
      return (
        <MatchRunError
          message={error?.message ?? "Something went wrong."}
          onRetry={() => void reload()}
        />
      );
    }

    const match = record.response.matches.find(
      (item) => item.investor_id === selectedInvestorId,
    );
    if (selectedInvestorId && match) {
      const companyName =
        typeof record.response.parsed_company_profile.company_name === "string"
          ? record.response.parsed_company_profile.company_name
          : "this company";
      return (
        <MatchDetailPanel
          match={match}
          companyName={companyName}
          onBack={() => router.push(`/match/${runId}`)}
        />
      );
    }

    return (
      <MatchResultsScreen
        response={record.response}
        onSelectMatch={(investorId) =>
          router.push(`/match/${runId}?investor=${encodeURIComponent(investorId)}`)
        }
        onStartOver={() => router.push("/match")}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceSubnav />
      {renderContent()}
    </div>
  );
}
