import { Check, CircleDot } from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkspaceStep = "describe" | "clarify" | "match" | "results" | "detail";

const STEPS: { id: WorkspaceStep; label: string; meta: string }[] = [
  { id: "describe", label: "Describe", meta: "Step 1a" },
  { id: "clarify", label: "Clarify", meta: "Step 1b" },
  { id: "match", label: "Match", meta: "Step 2" },
  { id: "results", label: "Results", meta: "Step 3" },
  { id: "detail", label: "VC detail", meta: "Step 4" },
];

type WorkspaceStepperProps = {
  currentStep: WorkspaceStep;
};

export function WorkspaceStepper({ currentStep }: WorkspaceStepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <nav aria-label="Matching workflow" className="grid gap-2 sm:grid-cols-2">
      {STEPS.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isComplete = index < currentIndex;
        return (
          <div
            key={step.id}
            className={cn(
              "flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2",
              isCurrent
                ? "border-primary bg-primary text-primary-foreground"
                : isComplete
                  ? "border-primary/25 bg-card text-foreground"
                  : "border-border bg-background text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border",
                isCurrent
                  ? "border-primary-foreground"
                  : "border-current bg-background",
              )}
            >
              {isComplete ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <CircleDot className="size-3" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold uppercase">
                {step.meta}
              </span>
              <span className="block truncate text-sm font-medium">{step.label}</span>
            </span>
          </div>
        );
      })}
    </nav>
  );
}
