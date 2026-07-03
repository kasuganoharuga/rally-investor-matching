import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { displayValue, labelFromKey, PROFILE_FIELDS } from "./match-display";
import type { IntakeResponse } from "@/features/matching/types/match";

type FounderProfileSummaryProps = {
  response: IntakeResponse | null;
};

export function FounderProfileSummary({ response }: FounderProfileSummaryProps) {
  const profile = response?.parsed_company_profile ?? {};
  const missingFields = response?.missing_fields ?? [];

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Confirmed profile
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Company profile
          </h2>
        </div>
        {response ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Extracted
          </span>
        ) : null}
      </div>

      {response ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {PROFILE_FIELDS.map((field) => (
            <div
              key={field.key}
              className="min-h-16 rounded-lg bg-background px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{field.label}</p>
              <p className="mt-1 break-words text-sm font-medium text-foreground">
                {displayValue(profile[field.key])}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
          Waiting for the first company description.
        </div>
      )}

      {missingFields.length > 0 ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{missingFields.map(labelFromKey).join(", ")}</p>
        </div>
      ) : null}
    </section>
  );
}
