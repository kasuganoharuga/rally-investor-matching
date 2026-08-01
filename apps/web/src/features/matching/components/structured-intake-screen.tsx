"use client";

import { useState } from "react";
import { toast } from "sonner";

import { StructuredIntakeFooter } from "@/features/matching/components/structured-intake-footer";
import { StructuredIntakeStepBody } from "@/features/matching/components/structured-intake-step-body";
import {
  type IntakeStep,
  StructuredIntakeStepper,
} from "@/features/matching/components/structured-intake-stepper";
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
  // The button stays clickable even when incomplete, so a click can surface
  // a toast explaining why — a disabled button would just silently eat it.
  const canContinue = !isBusy;

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
    if (!isStructuredIntakeComplete(values)) {
      toast.error(
        "Complete the required company and investor-fit fields to run a match.",
      );
      return;
    }
    if (totalWeight !== 100) {
      toast.error("Score weights must total 100.");
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
      <StructuredIntakeStepper
        activeStep={activeStep}
        isBusy={isBusy}
        isStepComplete={isStepComplete}
        onStepChange={setActiveStep}
      />

      <form
        onSubmit={submit}
        className="mt-7 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      >
        <StructuredIntakeStepBody
          activeStep={activeStep}
          values={values}
          matchingConfiguration={matchingConfiguration}
          isBusy={isBusy}
          onTextChange={updateTextField}
          onSectorsChange={updateSectors}
          onDirectionsChange={(directions) =>
            setValues((current) => ({ ...current, directions }))
          }
          onCompanySummaryChange={(value) => updateTextField("companySummary", value)}
          onEditCompany={() => setActiveStep(0)}
          onEditSignals={() => setActiveStep(1)}
          onConfigurationChange={setMatchingConfiguration}
        />

        <StructuredIntakeFooter
          activeStep={activeStep}
          isBusy={isBusy}
          isSubmitting={isSubmitting}
          canContinue={canContinue}
          showWeightWarning={activeStep === 3 && totalWeight !== 100}
          onBack={() => setActiveStep((activeStep - 1) as IntakeStep)}
        />
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
