"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { MatchRecentDeal } from "@/features/matching/types/match";

import { labelFromCode, normalizeStageCode } from "./vc-detail-utils";
import { VcDealRow } from "./vc-deal-row";

type VcRecentDealsProps = {
  deals: MatchRecentDeal[];
  /** Stage selected upstream; null shows every deal. */
  activeStage?: string | null;
  onClearStage?: () => void;
};

const INITIAL_ROWS = 12;

function dealKey(deal: MatchRecentDeal, index: number): string {
  return `${deal.company ?? "deal"}-${deal.date ?? index}`;
}

/**
 * Compact by default. Every row previously carried a full company paragraph
 * plus a tag cloud, which made eight deals scroll like eighty.
 */
export function VcRecentDeals({
  deals,
  activeStage = null,
  onClearStage,
}: VcRecentDealsProps) {
  const [showAll, setShowAll] = useState(false);
  const [openDeal, setOpenDeal] = useState<string | null>(null);

  const normalizedStage = normalizeStageCode(activeStage);
  const filtered = normalizedStage
    ? deals.filter((deal) => normalizeStageCode(deal.round) === normalizedStage)
    : deals;
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_ROWS);
  const hidden = filtered.length - visible.length;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {filtered.length} {filtered.length === 1 ? "deal" : "deals"}
          </span>
          {activeStage ? (
            <button
              type="button"
              onClick={onClearStage}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {labelFromCode(activeStage)} only
              <X className="size-3" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {activeStage ? (
          <span className="text-sm text-muted-foreground">
            {deals.length} across all stages
          </span>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/55 text-xs uppercase text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Round
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Round size
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((deal, index) => {
                  const key = dealKey(deal, index);
                  return (
                    <VcDealRow
                      key={key}
                      deal={deal}
                      isOpen={openDeal === key}
                      onToggle={() => setOpenDeal(openDeal === key ? null : key)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {hidden > 0 ? (
            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="text-sm font-semibold text-primary transition hover:underline"
              >
                Show {hidden} more {hidden === 1 ? "deal" : "deals"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="px-5 py-8">
          <p className="text-sm text-muted-foreground">
            {activeStage
              ? `No deal rows are tagged ${labelFromCode(activeStage)}.`
              : "No company-level deal evidence is linked to this investor yet."}
          </p>
          {activeStage ? (
            <button
              type="button"
              onClick={onClearStage}
              className="mt-3 text-sm font-semibold text-primary transition hover:underline"
            >
              Show all stages
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
