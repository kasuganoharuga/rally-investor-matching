"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { UserRole } from "@/features/auth/types/auth";
import { StructuredIntakeSettingsActions } from "@/features/matching/components/structured-intake-settings-actions";
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
  matchingSettingsSchema,
  resolveMatchingConfiguration,
  sameMatchingWeights,
  type MatchingSettings,
} from "@/features/matching/types/matching-settings";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
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
    excluded_investor_types: [],
  };
}

function cloneMatchingConfiguration(
  configuration: MatchingConfiguration,
): MatchingConfiguration {
  return {
    weights: { ...configuration.weights },
    hard_filters: { ...configuration.hard_filters },
    result_limit: configuration.result_limit,
    excluded_investor_types: [...configuration.excluded_investor_types],
  };
}

function cloneStructuredIntake(values: StructuredIntakeValues): StructuredIntakeValues {
  return {
    ...values,
    sectors: [...values.sectors],
    directions: [...values.directions],
    customerTypes: [...values.customerTypes],
    businessModels: [...values.businessModels],
  };
}

export function StructuredIntakeScreen({
  isSubmitting,
  errorMessage,
  initialValues,
  initialSettings,
  initialConfiguration,
  userRole,
  initialStep = 0,
  showScoringStep,
  onSettingsSaved,
  onSubmit,
}: {
  isSubmitting: boolean;
  errorMessage: string | null;
  initialValues?: StructuredIntakeValues;
  initialSettings: MatchingSettings;
  initialConfiguration?: MatchingConfiguration;
  userRole: UserRole;
  initialStep?: IntakeStep;
  showScoringStep: boolean;
  onSettingsSaved: (settings: MatchingSettings) => void;
  onSubmit: (
    message: string,
    configuration: MatchingConfiguration,
    values: StructuredIntakeValues,
  ) => void;
}) {
  const [values, setValues] = useState<StructuredIntakeValues>(() =>
    cloneStructuredIntake(initialValues ?? EMPTY_STRUCTURED_INTAKE),
  );
  const [matchingConfiguration, setMatchingConfiguration] = useState(() =>
    resolveMatchingConfiguration(
      userRole,
      initialSettings.configuration,
      initialConfiguration,
    ),
  );
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const hasUnsavedSettings = !sameMatchingWeights(
    matchingConfiguration,
    savedSettings.configuration,
  );
  const finalStep: IntakeStep = showScoringStep ? 3 : 2;
  const [activeStep, setActiveStep] = useState<IntakeStep>(() =>
    initialStep > finalStep ? finalStep : initialStep,
  );
  const isBusy = isSubmitting || isSavingSettings;
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

  async function persistSettings(reset = false) {
    if (isBusy) return;
    setIsSavingSettings(true);
    try {
      const data = await apiFetch<MatchingSettings>("/api/matching/settings", {
        method: reset ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reset
            ? { expectedRevision: savedSettings.personalRevision }
            : {
                configuration: matchingConfiguration,
                expectedRevision:
                  userRole === "admin"
                    ? savedSettings.globalRevision
                    : (savedSettings.personalRevision ?? 0),
              },
        ),
      });
      const nextSettings = matchingSettingsSchema.parse(data);
      setSavedSettings(nextSettings);
      onSettingsSaved(nextSettings);
      setMatchingConfiguration((current) => ({
        ...current,
        weights: { ...nextSettings.configuration.weights },
      }));
      toast.success(
        reset
          ? "Your matches now use the global score weights."
          : userRole === "admin"
            ? "Global score weights published."
            : "Your personal score weights saved.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Unable to save matching settings.",
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

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
    if (activeStep < finalStep) {
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
    if (showScoringStep && hasUnsavedSettings) {
      toast.error("Save or discard your score weights before running a match.");
      return;
    }
    if (canSubmit) {
      onSubmit(
        buildStructuredIntakeMessage(values),
        cloneMatchingConfiguration(matchingConfiguration),
        cloneStructuredIntake(values),
      );
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
        showScoringStep={showScoringStep}
        isStepComplete={isStepComplete}
        onStepChange={setActiveStep}
      />

      <form
        onSubmit={submit}
        className="mt-7 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      >
        {showScoringStep && activeStep === 3 ? (
          <StructuredIntakeSettingsActions
            userRole={userRole}
            source={savedSettings.source}
            isBusy={isBusy}
            isSaving={isSavingSettings}
            hasUnsavedSettings={hasUnsavedSettings}
            hasValidTotal={totalWeight === 100}
            onSave={() => void persistSettings()}
            onDiscard={() =>
              setMatchingConfiguration((current) => ({
                ...current,
                weights: { ...savedSettings.configuration.weights },
              }))
            }
            onReset={() => {
              if (userRole === "reviewer" && savedSettings.personalRevision !== null) {
                void persistSettings(true);
              } else {
                setMatchingConfiguration((current) => ({
                  ...current,
                  weights: {
                    ...(userRole === "admin"
                      ? defaultMatchingConfiguration().weights
                      : savedSettings.globalConfiguration.weights),
                  },
                }));
              }
            }}
          />
        ) : null}
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
          onCustomerTypesChange={(customerTypes) =>
            setValues((current) => ({ ...current, customerTypes }))
          }
          onBusinessModelsChange={(businessModels) =>
            setValues((current) => ({ ...current, businessModels }))
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
          finalStep={finalStep}
          showWeightWarning={showScoringStep && activeStep === 3 && totalWeight !== 100}
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
