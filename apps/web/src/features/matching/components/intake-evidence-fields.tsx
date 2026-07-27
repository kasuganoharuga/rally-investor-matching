"use client";

import { FileText, Paperclip, Sparkles, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { UploadedFounderFile } from "@/features/matching/hooks/use-match-intake";
import type { StructuredIntakeValues } from "@/features/matching/types/structured-intake";
import { cn } from "@/lib/utils";

function FileChip({
  file,
  disabled,
  onRemove,
}: {
  file: UploadedFounderFile;
  disabled: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        file.errorMessage
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-background text-muted-foreground",
      )}
      title={file.errorMessage ?? undefined}
    >
      <FileText className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{file.name}</span>
      <span>{file.errorMessage ? "Failed" : "Ready"}</span>
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        disabled={disabled}
        className="text-foreground/70 transition hover:text-destructive disabled:opacity-40"
        aria-label={`Remove ${file.name}`}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

export function IntakeEvidenceFields({
  values,
  uploadedFiles,
  disabled,
  isReadingFiles,
  onChange,
  onFilesSelected,
  onRemoveFile,
}: {
  values: StructuredIntakeValues;
  uploadedFiles: UploadedFounderFile[];
  disabled: boolean;
  isReadingFiles: boolean;
  onChange: (field: "tractionSummary" | "additionalContext", value: string) => void;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <fieldset className="grid gap-5 p-5 md:p-7" disabled={disabled}>
      <legend className="sr-only">Evidence and context</legend>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Sparkles className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Evidence and context
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the evidence that helps distinguish this raise.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="traction-summary"
            className="text-sm font-semibold text-foreground"
          >
            Traction
          </label>
          <Textarea
            id="traction-summary"
            value={values.tractionSummary}
            onChange={(event) => onChange("tractionSummary", event.target.value)}
            placeholder="Revenue, pilots, customers, growth, or other proof points"
            className="min-h-28 resize-y"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="additional-context"
            className="text-sm font-semibold text-foreground"
          >
            Investor preferences
          </label>
          <Textarea
            id="additional-context"
            value={values.additionalContext}
            onChange={(event) => onChange("additionalContext", event.target.value)}
            placeholder="Any investor experience, network, or approach that matters"
            className="min-h-28 resize-y"
          />
        </div>
      </div>

      <div className="border-t border-border pt-5">
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isReadingFiles}
          >
            <Paperclip className="size-4" aria-hidden="true" />
            {isReadingFiles ? "Reading file" : "Attach pitch deck"}
          </Button>
          <span className="text-xs text-muted-foreground">PDF, Word, or TXT</span>
        </div>

        {uploadedFiles.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <FileChip
                key={file.id}
                file={file}
                disabled={disabled || isReadingFiles}
                onRemove={onRemoveFile}
              />
            ))}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
