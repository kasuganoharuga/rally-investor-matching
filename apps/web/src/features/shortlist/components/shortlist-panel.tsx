"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { InvestorListItem } from "@/features/investors/components/investor-list-item";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";
import { cn } from "@/lib/utils";

export function ShortlistPanel() {
  const shortlist = useShortlist();

  if (shortlist.isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <Loader2 className="mx-auto size-6 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          Loading your shortlist...
        </p>
      </section>
    );
  }

  if (shortlist.error && shortlist.items.length === 0) {
    return (
      <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
        <h2 className="font-semibold text-destructive">Unable to load shortlist</h2>
        <p className="mt-2 text-sm text-destructive">{shortlist.error.message}</p>
        <button
          type="button"
          onClick={() => void shortlist.refresh()}
          className="mt-4 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
        >
          Retry
        </button>
      </section>
    );
  }

  if (shortlist.items.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary/60 text-primary">
          <Bookmark className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          No saved investors yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Save investors from the directory or from match results, then review them
          here as one working shortlist.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/investors" className={cn(buttonVariants({ size: "lg" }))}>
            Browse investors
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/match"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            )}
          >
            Start matching
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {shortlist.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shortlist.error.message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {shortlist.items.map((item) => (
          <InvestorListItem
            key={item.id}
            investor={item.investor}
            isShortlisted={shortlist.isShortlisted(item.investor.id)}
            isShortlistPending={shortlist.isPending(item.investor.id)}
            onToggleShortlist={shortlist.toggle}
          />
        ))}
      </div>
    </section>
  );
}
