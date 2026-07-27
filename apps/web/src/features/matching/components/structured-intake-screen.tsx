"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CompanyProfileFields } from "@/features/matching/components/company-profile-fields";
import { FundraiseFields } from "@/features/matching/components/fundraise-fields";
import { MatchingSignalFields } from "@/features/matching/components/matching-signal-fields";
import { StructuredIntakeReview } from "@/features/matching/components/structured-intake-review";
import {
  buildStructuredIntakeMessage,
  EMPTY_STRUCTURED_INTAKE,
  getDirectionOptions,
  isCompanyAndRaiseComplete,
  isMatchingSignalsComplete,
  isStructuredIntakeComplete,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";
import { cn } from "@/lib/utils";

const INTAKE_STEPS = [
  {
    title: "Company & raise",
    shortDescription: "Company and funding round",
    heading: "Tell us about your company and round",
    description: "Add the core company, location, stage, and raise details.",
  },
  {
    title: "Matching signals",
    shortDescription: "Sector and operating model",
    heading: "Define your investor fit",
    description:
      "Choose the sectors, customer, and operating model investors should match.",
  },
  {
    title: "Review & match",
    shortDescription: "Check your selected details",
    heading: "Review your matching profile",
    description: "Check the structured information below before ranking investors.",
  },
];

type IntakeStep = 0 | 1 | 2;

export function StructuredIntakeScreen({
  isSubmitting,
  errorMessage,
  onSubmit,
}: {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (message: string) => void;
}) {
  const [values, setValues] = useState<StructuredIntakeValues>(EMPTY_STRUCTURED_INTAKE);
  const [activeStep, setActiveStep] = useState<IntakeStep>(0);
  const isBusy = isSubmitting;
  const companyAndRaiseComplete = isCompanyAndRaiseComplete(values);
  const matchingSignalsComplete = isMatchingSignalsComplete(values);
  const canSubmit = isStructuredIntakeComplete(values) && !isBusy;
  const canContinue =
    activeStep === 0
      ? companyAndRaiseComplete && !isBusy
      : activeStep === 1
        ? matchingSignalsComplete && !isBusy
        : canSubmit;
  const currentStep = INTAKE_STEPS[activeStep];

  function updateTextField(field: keyof StructuredIntakeValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateSectors(sectors: string[]) {
    const allowedDirections = new Set(
      getDirectionOptions(sectors).map((option) => option.value),
    );
    setValues((current) => ({
      ...current,
      sectors,
      directions: current.directions.filter((direction) =>
        allowedDirections.has(direction),
      ),
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeStep < 2) {
      if (canContinue) {
        setActiveStep((activeStep + 1) as IntakeStep);
      }
      return;
    }
    if (canSubmit) {
      onSubmit(buildStructuredIntakeMessage(values));
    }
  }

  function canOpenStep(step: IntakeStep): boolean {
    if (step <= activeStep) {
      return true;
    }
    if (step === 1) {
      return companyAndRaiseComplete;
    }
    return companyAndRaiseComplete && matchingSignalsComplete;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-7 md:py-10">
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

        <ol className="mt-6 grid gap-2 sm:grid-cols-3">
          {INTAKE_STEPS.map((step, index) => {
            const stepIndex = index as IntakeStep;
            const isActive = stepIndex === activeStep;
            const isComplete = stepIndex < activeStep;
            const isAvailable = canOpenStep(stepIndex);
            return (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => setActiveStep(stepIndex)}
                  disabled={!isAvailable || isBusy}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition",
                    isActive
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground",
                    isAvailable &&
                      !isActive &&
                      "hover:border-primary/40 hover:text-foreground",
                    !isAvailable && "cursor-not-allowed opacity-50",
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
                    <span className="mt-0.5 block text-xs">
                      {step.shortDescription}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <form
        onSubmit={submit}
        className="mt-7 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      >
        {activeStep === 0 ? (
          <>
            <CompanyProfileFields
              values={values}
              disabled={isBusy}
              onChange={updateTextField}
            />
            <FundraiseFields
              values={values}
              disabled={isBusy}
              onChange={updateTextField}
            />
          </>
        ) : null}

        {activeStep === 1 ? (
          <MatchingSignalFields
            values={values}
            disabled={isBusy}
            onTextChange={updateTextField}
            onSectorsChange={updateSectors}
            onDirectionsChange={(directions) =>
              setValues((current) => ({ ...current, directions }))
            }
          />
        ) : null}

        {activeStep === 2 ? <StructuredIntakeReview values={values} /> : null}

        <div className="flex flex-col gap-3 border-t border-border bg-muted/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
          <div>
            {activeStep > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep((activeStep - 1) as IntakeStep)}
                disabled={isBusy}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Required fields are marked with an asterisk.
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/85"
            disabled={!canContinue}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {isSubmitting
              ? "Starting match"
              : activeStep === 2
                ? "Start matching"
                : "Continue"}
            {!isSubmitting ? (
              <ArrowRight className="size-4" aria-hidden="true" />
            ) : null}
          </Button>
        </div>
      </form>

      {errorMessage ? (
        <div
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
