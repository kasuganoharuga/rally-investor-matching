import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StructuredIntakeFooter({
  activeStep,
  isBusy,
  isSubmitting,
  canContinue,
  finalStep,
  showWeightWarning,
  onBack,
}: {
  activeStep: number;
  isBusy: boolean;
  isSubmitting: boolean;
  canContinue: boolean;
  finalStep: number;
  showWeightWarning: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border bg-muted/35 px-5 py-4 sm:flex-row sm:items-start sm:justify-between md:px-7">
      <div className="flex flex-col items-start gap-2">
        {activeStep > 0 ? (
          <Button type="button" variant="outline" onClick={onBack} disabled={isBusy}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Required fields are marked with an asterisk.
          </p>
        )}
        {showWeightWarning ? (
          <p className="text-xs font-medium text-warning">
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
          : activeStep === finalStep
            ? finalStep === 3
              ? "Run test match"
              : "Run match"
            : "Continue"}
        {!isSubmitting ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </Button>
    </div>
  );
}
