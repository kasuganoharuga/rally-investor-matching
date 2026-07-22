"use client";

import { Bookmark, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ShortlistSource } from "@/features/shortlist/types/shortlist";
import { cn } from "@/lib/utils";

type ShortlistToggleButtonProps = {
  investorId: string;
  investorName: string;
  source: ShortlistSource;
  isShortlisted: boolean;
  isPending: boolean;
  onToggle: (investorId: string, source: ShortlistSource) => void;
  presentation?: "icon" | "action";
  className?: string;
};

export function ShortlistToggleButton({
  investorId,
  investorName,
  source,
  isShortlisted,
  isPending,
  onToggle,
  presentation = "icon",
  className,
}: ShortlistToggleButtonProps) {
  const label = isShortlisted
    ? `Remove ${investorName} from shortlist`
    : `Save ${investorName}`;
  const icon = isPending ? (
    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
  ) : (
    <Bookmark
      className={cn("size-4", isShortlisted ? "fill-current" : "")}
      aria-hidden="true"
    />
  );

  if (presentation === "action") {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        className={cn(
          isShortlisted
            ? "border-secondary bg-secondary/30 text-secondary-foreground hover:bg-secondary/50"
            : "",
          className,
        )}
        aria-pressed={isShortlisted}
        aria-label={label}
        disabled={isPending}
        onClick={() => onToggle(investorId, source)}
      >
        {icon}
        {isShortlisted ? "Saved to shortlist" : "Save to shortlist"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-wait disabled:opacity-70",
        isShortlisted
          ? "border-secondary bg-secondary/40 text-primary hover:bg-secondary/60"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary",
        className,
      )}
      aria-pressed={isShortlisted}
      aria-label={label}
      disabled={isPending}
      onClick={() => onToggle(investorId, source)}
    >
      {icon}
    </button>
  );
}
