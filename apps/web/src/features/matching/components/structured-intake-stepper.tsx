import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export const INTAKE_STEPS = [
  {
    title: "Company & raise",
    shortDescription: "Company and funding round",
    heading: "Tell us about your company and round",
    description: "Add the core company, location, stage, and raise details.",
  },
  {
    title: "Matching signals",
    shortDescription: "Sector, operating model, and context",
    heading: "Define your investor fit",
    description:
      "Choose the sectors, customer, and operating model investors should match, then add any optional context.",
  },
  {
    title: "Review",
    shortDescription: "Check your selected details",
    heading: "Review your matching profile",
    description: "Check the selected details before testing the ranking setup.",
  },
  {
    title: "Test scoring",
    shortDescription: "Adjust ranking priorities",
    heading: "Test the ranking setup",
    description:
      "Adjust score priorities and choose which eligibility rules apply to this test.",
  },
] as const;

export type IntakeStep = 0 | 1 | 2 | 3;

export function StructuredIntakeStepper({
  activeStep,
  isBusy,
  isStepComplete,
  onStepChange,
}: {
  activeStep: IntakeStep;
  isBusy: boolean;
  isStepComplete: (step: IntakeStep) => boolean;
  onStepChange: (step: IntakeStep) => void;
}) {
  const currentStep = INTAKE_STEPS[activeStep];

  return (
    <div className="border-b border-border pb-7">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
        <span className="size-2 rounded-full bg-primary" />
        Step {activeStep + 1} of {INTAKE_STEPS.length}
      </div>
      <h1 className="mt-4 text-3xl font-semibold text-foreground">
        {currentStep.heading}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {currentStep.description}
      </p>

      <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {INTAKE_STEPS.map((step, index) => {
          const stepIndex = index as IntakeStep;
          const isActive = stepIndex === activeStep;
          const isComplete = isStepComplete(stepIndex);
          return (
            <li key={step.title}>
              <button
                type="button"
                onClick={() => onStepChange(stepIndex)}
                disabled={isBusy}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition",
                  isActive
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground",
                  !isActive && "hover:border-primary/40 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isActive || isComplete
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="mt-0.5 block text-xs">{step.shortDescription}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
