import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  "Describe your raise",
  "Confirm key signals",
  "Get ranked matches",
  "Review intro paths",
];

export function WorkflowStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-3 text-sm">
      {WORKFLOW_STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-full border text-xs font-semibold",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDone
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-3" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={cn(
                "font-semibold",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
            {index < WORKFLOW_STEPS.length - 1 ? (
              <span className="text-muted-foreground">→</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
