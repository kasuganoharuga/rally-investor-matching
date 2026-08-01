import { Loader2 } from "lucide-react";

import { WorkflowStepper } from "@/features/matching/components/workflow-stepper";

export function MatchingProgressScreen() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-card shadow-lg">
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-foreground">
        Building your ranked investor matches
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Extracting key founder signals, checking investor eligibility, and scoring the
        strongest evidence-backed fits.
      </p>
      <div className="mt-7 grid w-full gap-2 sm:grid-cols-3">
        {["Profile signals", "Investor evidence", "Fit scoring"].map((item, index) => (
          <div
            key={item}
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
          >
            <span className="mb-2 block text-xs text-muted-foreground">
              0{index + 1}
            </span>
            {item}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <WorkflowStepper activeIndex={2} />
      </div>
    </section>
  );
}
