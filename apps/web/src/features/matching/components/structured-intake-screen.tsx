"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, MessageSquareText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CompanyProfileFields } from "@/features/matching/components/company-profile-fields";
import { FundraiseFields } from "@/features/matching/components/fundraise-fields";
import { MatchingSignalFields } from "@/features/matching/components/matching-signal-fields";
import { StructuredIntakeReview } from "@/features/matching/components/structured-intake-review";
import { StructuredIntakeScoring } from "@/features/matching/components/structured-intake-scoring";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  type MatchingConfiguration,
} from "@/features/matching/types/match";
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
];

type IntakeStep = 0 | 1 | 2 | 3;

function defaultMatchingConfiguration(): MatchingConfiguration {
  return {
    weights: { ...DEFAULT_MATCHING_CONFIGURATION.weights },
    hard_filters: { ...DEFAULT_MATCHING_CONFIGURATION.hard_filters },
    result_limit: DEFAULT_MATCHING_CONFIGURATION.result_limit,
  };
}

export function StructuredIntakeScreen({
  isSubmitting,
  errorMessage,
  onSubmit,
}: {
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (message: string, configuration: MatchingConfiguration) => void;
}) {
  const [values, setValues] = useState<StructuredIntakeValues>(EMPTY_STRUCTURED_INTAKE);
  const [matchingConfiguration, setMatchingConfiguration] =
    useState<MatchingConfiguration>(defaultMatchingConfiguration);
  const [activeStep, setActiveStep] = useState<IntakeStep>(0);
  const isBusy = isSubmitting;
  const companyAndRaiseComplete = isCompanyAndRaiseComplete(values);
  const matchingSignalsComplete = isMatchingSignalsComplete(values);
  const totalWeight = Object.values(matchingConfiguration.weights).reduce(
    (total, value) => total + value,
    0,
  );
  const canSubmit =
    isStructuredIntakeComplete(values) && totalWeight === 100 && !isBusy;
  const canContinue = activeStep < 3 ? !isBusy : canSubmit;
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
    if (activeStep < 3) {
      setActiveStep((activeStep + 1) as IntakeStep);
      return;
    }
    if (canSubmit) {
      onSubmit(buildStructuredIntakeMessage(values), {
        ...matchingConfiguration,
        result_limit:
          matchingConfiguration.result_limit ??
          DEFAULT_MATCHING_CONFIGURATION.result_limit,
      });
    }
  }

  function isStepComplete(step: IntakeStep): boolean {
    if (step === 0) {
      return companyAndRaiseComplete;
    }
    if (step === 1) {
      return matchingSignalsComplete;
    }
    if (step === 2) {
      return companyAndRaiseComplete && matchingSignalsComplete;
    }
    return false;
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

        <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {INTAKE_STEPS.map((step, index) => {
            const stepIndex = index as IntakeStep;
            const isActive = stepIndex === activeStep;
            const isComplete = isStepComplete(stepIndex);
            return (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => setActiveStep(stepIndex)}
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
          <>
            <MatchingSignalFields
              values={values}
              disabled={isBusy}
              onTextChange={updateTextField}
              onSectorsChange={updateSectors}
              onDirectionsChange={(directions) =>
                setValues((current) => ({ ...current, directions }))
              }
            />
            <section className="border-t border-border p-5 md:p-7">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MessageSquareText className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Additional company context
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Optional details not covered by the selected fields.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                <label
                  htmlFor="company-summary"
                  className="text-sm font-semibold text-foreground"
                >
                  Company summary
                  <span className="ml-1 font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Textarea
                  id="company-summary"
                  value={values.companySummary}
                  onChange={(event) =>
                    updateTextField("companySummary", event.target.value)
                  }
                  disabled={isBusy}
                  placeholder="Add product, traction, or fundraising context that may improve the match."
                  className="min-h-28 resize-y"
                />
              </div>
            </section>
          </>
        ) : null}

        {activeStep === 2 ? (
          <StructuredIntakeReview
            values={values}
            onEditCompany={() => setActiveStep(0)}
            onEditSignals={() => setActiveStep(1)}
          />
        ) : null}

        {activeStep === 3 ? (
          <StructuredIntakeScoring
            configuration={matchingConfiguration}
            disabled={isBusy}
            onChange={setMatchingConfiguration}
          />
        ) : null}

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
            {activeStep === 3 && !isStructuredIntakeComplete(values) ? (
              <p className="text-xs font-medium text-amber-800">
                Complete the required company and investor-fit fields to run a match.
              </p>
            ) : null}
            {activeStep === 3 && totalWeight !== 100 ? (
              <p className="text-xs font-medium text-amber-800">
                Score weights must total 100.
              </p>
            ) : null}
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
              : activeStep === 3
                ? "Run test match"
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
