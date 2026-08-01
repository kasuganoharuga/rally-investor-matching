import { Badge } from "@/components/ui/badge";
import {
  getIntakeOptionLabel,
  type IntakeOption,
} from "@/features/matching/types/structured-intake";
import { cn } from "@/lib/utils";

export function labelsFor(options: IntakeOption[], values: string[]): string[] {
  return values.map((value) => getIntakeOptionLabel(options, value));
}

function ReviewLabel({ label }: { label: string }) {
  return <dt className="text-sm font-medium text-muted-foreground">{label}</dt>;
}

function ReviewEmpty() {
  return <dd className="mt-1 text-sm text-muted-foreground italic">Not specified</dd>;
}

/** Free-text or plain values: company name, target raise (as a stat), long-form context. */
export function ReviewItem({
  label,
  value,
  wide = false,
  emphasize = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <ReviewLabel label={label} />
      {value ? (
        <dd
          className={cn(
            "leading-6",
            emphasize
              ? "mt-1 text-2xl font-bold text-primary"
              : "mt-1 text-sm font-semibold text-foreground",
          )}
        >
          {value}
        </dd>
      ) : (
        <ReviewEmpty />
      )}
    </div>
  );
}

/**
 * Some option labels carry a trailing explanation for the dropdown
 * ("AI-enabled - AI improves selected features") — useful when picking,
 * but too long for a single-line badge once selected. Show just the name.
 */
function shortLabel(value: string): string {
  return value.split(" - ")[0] ?? value;
}

/** A single value picked from a dropdown — rendered as a badge to read as a category, not a sentence. */
export function ReviewBadgeItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <ReviewLabel label={label} />
      {value ? (
        <dd className="mt-1.5">
          <Badge variant="outline">{shortLabel(value)}</Badge>
        </dd>
      ) : (
        <ReviewEmpty />
      )}
    </div>
  );
}

/** Multi-select values — rendered as a chip list instead of a comma-joined sentence. */
export function ReviewChipsItem({
  label,
  values,
  wide = false,
}: {
  label: string;
  values: string[];
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <ReviewLabel label={label} />
      {values.length > 0 ? (
        <dd className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge key={value} variant="outline">
              {value}
            </Badge>
          ))}
        </dd>
      ) : (
        <ReviewEmpty />
      )}
    </div>
  );
}
