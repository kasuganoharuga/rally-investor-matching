"use client";

import { ArrowRight, Lightbulb, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MatchDetailWatchOuts } from "@/features/matching/components/match-detail-watch-outs";
import type { MatchResult } from "@/features/matching/types/match";
import { ShortlistToggleButton } from "@/features/shortlist/components/shortlist-toggle-button";
import { useShortlist } from "@/features/shortlist/hooks/use-shortlist";
import { cn } from "@/lib/utils";

export function MatchDetailActions({ match }: { match: MatchResult }) {
  const shortlist = useShortlist();
  const warmIntro = Boolean(match.investor_profile?.warm_intro_available);

  return (
    <>
      <MatchDetailWatchOuts match={match} />

      <section
        className={cn(
          "rounded-lg border p-5",
          warmIntro
            ? "border-secondary bg-secondary/20 text-secondary-foreground"
            : "border-border bg-card text-foreground",
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-1 size-2.5 rounded-full bg-primary" />
          <div>
            <h2 className="font-semibold">
              {warmIntro ? "Warm intro path available" : "Intro path not confirmed"}
            </h2>
            <p className="mt-1 text-sm leading-6">
              {warmIntro
                ? "Rally has a possible route here. Request an intro and the team can review before forwarding."
                : "No known warm path is attached yet. Review profile and network notes before outreach."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-current/20 pt-4">
          <Button type="button">
            <ArrowRight className="size-4" aria-hidden="true" />
            Request warm intro
          </Button>
          <Button type="button" variant="outline">
            <Lightbulb className="size-4" aria-hidden="true" />
            Ask AI to draft outreach
          </Button>
        </div>
      </section>

      {shortlist.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shortlist.error.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ShortlistToggleButton
          investorId={match.investor_id}
          investorName={match.investor_name}
          source="match_detail"
          isShortlisted={shortlist.isShortlisted(match.investor_id)}
          isPending={shortlist.isPending(match.investor_id)}
          onToggle={shortlist.toggle}
          presentation="action"
          className="w-full"
        />
        <Button type="button" variant="outline" size="lg">
          <X className="size-4" aria-hidden="true" />
          Mark as not relevant
        </Button>
      </div>
    </>
  );
}
