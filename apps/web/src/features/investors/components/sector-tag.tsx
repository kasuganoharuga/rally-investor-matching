import { titleCase } from "@/features/investors/components/investor-detail-format";
import { cn } from "@/lib/utils";

/**
 * Deliberately monochrome. This used to map each sector to its own pastel hue,
 * but the colours were arbitrary — nobody can decode "violet = enterprise
 * software" — and a profile renders 8-16 of them at once, which turned every
 * page into confetti. Colour is now reserved for signals that mean something
 * (lead behaviour, match tier); classification tags carry weight instead.
 */
export function SectorTag({
  sector,
  className,
}: {
  sector: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full border border-border bg-muted px-2.5 py-1 text-xs leading-5 font-medium break-words whitespace-normal text-foreground",
        className,
      )}
    >
      {titleCase(sector)}
    </span>
  );
}
