import { CompanyProfileFields } from "@/features/matching/components/company-profile-fields";
import { FundraiseFields } from "@/features/matching/components/fundraise-fields";
import { MatchingSignalFields } from "@/features/matching/components/matching-signal-fields";
import { StructuredIntakeContextFields } from "@/features/matching/components/structured-intake-context-fields";
import { StructuredIntakeReview } from "@/features/matching/components/structured-intake-review";
import { StructuredIntakeScoring } from "@/features/matching/components/structured-intake-scoring";
import type { IntakeStep } from "@/features/matching/components/structured-intake-stepper";
import type { MatchingConfiguration } from "@/features/matching/types/match";
import type { StructuredIntakeValues } from "@/features/matching/types/structured-intake";

export function StructuredIntakeStepBody({
  activeStep,
  values,
  matchingConfiguration,
  isBusy,
  onTextChange,
  onSectorsChange,
  onDirectionsChange,
  onCustomerTypesChange,
  onBusinessModelsChange,
  onCompanySummaryChange,
  onEditCompany,
  onEditSignals,
  onConfigurationChange,
}: {
  activeStep: IntakeStep;
  values: StructuredIntakeValues;
  matchingConfiguration: MatchingConfiguration;
  isBusy: boolean;
  onTextChange: (field: keyof StructuredIntakeValues, value: string) => void;
  onSectorsChange: (sectors: string[]) => void;
  onDirectionsChange: (directions: string[]) => void;
  onCustomerTypesChange: (customerTypes: string[]) => void;
  onBusinessModelsChange: (businessModels: string[]) => void;
  onCompanySummaryChange: (value: string) => void;
  onEditCompany: () => void;
  onEditSignals: () => void;
  onConfigurationChange: (configuration: MatchingConfiguration) => void;
}) {
  if (activeStep === 0) {
    return (
      <>
        <CompanyProfileFields
          values={values}
          disabled={isBusy}
          onChange={onTextChange}
        />
        <FundraiseFields values={values} disabled={isBusy} onChange={onTextChange} />
      </>
    );
  }

  if (activeStep === 1) {
    return (
      <>
        <MatchingSignalFields
          values={values}
          disabled={isBusy}
          onTextChange={onTextChange}
          onSectorsChange={onSectorsChange}
          onDirectionsChange={onDirectionsChange}
          onCustomerTypesChange={onCustomerTypesChange}
          onBusinessModelsChange={onBusinessModelsChange}
        />
        <StructuredIntakeContextFields
          value={values.companySummary}
          disabled={isBusy}
          onChange={onCompanySummaryChange}
        />
      </>
    );
  }

  if (activeStep === 2) {
    return (
      <StructuredIntakeReview
        values={values}
        onEditCompany={onEditCompany}
        onEditSignals={onEditSignals}
      />
    );
  }

  return (
    <StructuredIntakeScoring
      configuration={matchingConfiguration}
      disabled={isBusy}
      onChange={onConfigurationChange}
    />
  );
}
