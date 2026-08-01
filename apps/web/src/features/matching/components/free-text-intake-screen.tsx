"use client";

import { ArrowRight, Paperclip } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadedFileChip } from "@/features/matching/components/uploaded-file-chip";
import { WorkflowStepper } from "@/features/matching/components/workflow-stepper";
import type { UploadedFounderFile } from "@/features/matching/hooks/use-match-intake";

const PROMPT_CHIPS = [
  '"We\'re pre-seed, building..."',
  '"Raising AUD $1.5M for..."',
  '"We\'re looking for ANZ seed investors..."',
];

export function FreeTextIntakeScreen({
  message,
  uploadedFiles,
  isSubmitting,
  isReadingFiles,
  errorMessage,
  onMessageChange,
  onFilesSelected,
  onRemoveFile,
  onSubmit,
}: {
  message: string;
  uploadedFiles: UploadedFounderFile[];
  isSubmitting: boolean;
  isReadingFiles: boolean;
  errorMessage: string | null;
  onMessageChange: (value: string) => void;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onSubmit: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit =
    (message.trim().length > 0 || uploadedFiles.length > 0) &&
    !isSubmitting &&
    !isReadingFiles;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
        <span className="size-2 rounded-full bg-primary" />
        Step 1 of 4 · Build your matching profile
      </div>

      <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        Tell us about your company and fundraise
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
        Describe your product, traction, round, geography, and ideal investors in your
        own words. Rally will turn this into a structured matching profile before
        generating matches.
      </p>

      <div className="mt-8 w-full rounded-lg border border-border bg-card p-5 text-left shadow-xl shadow-foreground/5">
        <Textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={
            'For example: "We\'re building an AI copilot for support teams and raising a seed round to expand across ANZ."'
          }
          className="min-h-32 resize-none border-0 bg-transparent p-0 text-base leading-7 shadow-none focus-visible:ring-0"
          disabled={isSubmitting}
        />

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(event) => {
                  onFilesSelected(event.target.files);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isReadingFiles}
              >
                <Paperclip className="size-4" aria-hidden="true" />
                {isReadingFiles ? "Reading file" : "Attach pitch deck"}
              </Button>
              {uploadedFiles.map((file) => (
                <UploadedFileChip
                  key={file.id}
                  file={file}
                  disabled={isSubmitting || isReadingFiles}
                  onRemove={onRemoveFile}
                />
              ))}
            </div>

            <Button
              type="button"
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/85"
              onClick={onSubmit}
              disabled={!canSubmit}
            >
              Start matching
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-left text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-7 flex w-full flex-wrap items-center justify-center gap-3 text-left text-sm">
        <span className="font-semibold text-muted-foreground">Try:</span>
        {PROMPT_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onMessageChange(chip.replaceAll('"', ""))}
            className="min-w-44 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground shadow-sm transition hover:border-primary/50 hover:text-foreground"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <WorkflowStepper activeIndex={0} />
      </div>
    </section>
  );
}
