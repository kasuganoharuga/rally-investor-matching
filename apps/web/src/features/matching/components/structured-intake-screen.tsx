"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CompanyProfileFields } from "@/features/matching/components/company-profile-fields";
import { FundraiseFields } from "@/features/matching/components/fundraise-fields";
import { IntakeEvidenceFields } from "@/features/matching/components/intake-evidence-fields";
import { MatchingSignalFields } from "@/features/matching/components/matching-signal-fields";
import type { UploadedFounderFile } from "@/features/matching/hooks/use-match-intake";
import {
  buildStructuredIntakeMessage,
  EMPTY_STRUCTURED_INTAKE,
  getDirectionOptions,
  isStructuredIntakeComplete,
  type StructuredIntakeValues,
} from "@/features/matching/types/structured-intake";

const WORKFLOW_STEPS = [
  "Build profile",
  "Confirm signals",
  "Rank investors",
  "Review matches",
];

export function StructuredIntakeScreen({
  uploadedFiles,
  isSubmitting,
  isReadingFiles,
  errorMessage,
  onFilesSelected,
  onRemoveFile,
  onSubmit,
}: {
  uploadedFiles: UploadedFounderFile[];
  isSubmitting: boolean;
  isReadingFiles: boolean;
  errorMessage: string | null;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onSubmit: (message: string) => void;
}) {
  const [values, setValues] = useState<StructuredIntakeValues>(EMPTY_STRUCTURED_INTAKE);
  const isBusy = isSubmitting || isReadingFiles;
  const canSubmit = isStructuredIntakeComplete(values) && !isBusy;

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
    if (!canSubmit) {
      return;
    }
    onSubmit(buildStructuredIntakeMessage(values));
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-7 md:py-10">
      <div className="flex flex-col gap-6 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <span className="size-2 rounded-full bg-primary" />
            New investor match
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">
            Build your matching profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Select the signals that describe the company and current round.
          </p>
        </div>

        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {WORKFLOW_STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span
                className={
                  index === 0
                    ? "flex size-6 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
                    : "flex size-6 items-center justify-center rounded-full border border-border bg-card font-semibold text-muted-foreground"
                }
              >
                {index + 1}
              </span>
              <span
                className={
                  index === 0
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }
              >
                {step}
              </span>
              {index < WORKFLOW_STEPS.length - 1 ? (
                <ArrowRight
                  className="size-3.5 text-muted-foreground/60"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <form
        onSubmit={submit}
        className="mt-7 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      >
        <CompanyProfileFields
          values={values}
          disabled={isBusy}
          onChange={updateTextField}
        />
        <FundraiseFields values={values} disabled={isBusy} onChange={updateTextField} />
        <MatchingSignalFields
          values={values}
          disabled={isBusy}
          onTextChange={updateTextField}
          onSectorsChange={updateSectors}
          onDirectionsChange={(directions) =>
            setValues((current) => ({ ...current, directions }))
          }
        />
        <IntakeEvidenceFields
          values={values}
          uploadedFiles={uploadedFiles}
          disabled={isSubmitting}
          isReadingFiles={isReadingFiles}
          onChange={updateTextField}
          onFilesSelected={onFilesSelected}
          onRemoveFile={onRemoveFile}
        />

        <div className="flex flex-col gap-3 border-t border-border bg-muted/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
          <p className="text-xs text-muted-foreground">
            Required fields are marked with an asterisk.
          </p>
          <Button
            type="submit"
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/85"
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {isSubmitting ? "Starting match" : "Start matching"}
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
