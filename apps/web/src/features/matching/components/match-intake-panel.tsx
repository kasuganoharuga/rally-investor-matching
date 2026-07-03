"use client";

import { Paperclip, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { useRef } from "react";

import { WorkspaceStepper, type WorkspaceStep } from "./workspace-stepper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  ChatMessage,
  UploadedFounderFile,
} from "@/features/matching/hooks/use-match-intake";
import type { IntakeResponse } from "@/features/matching/types/match";
import type { ApiError } from "@/lib/api/errors";

type MatchIntakePanelProps = {
  currentStep: WorkspaceStep;
  message: string;
  followUpAnswer: string;
  response: IntakeResponse | null;
  messages: ChatMessage[];
  uploadedFiles: UploadedFounderFile[];
  isSubmitting: boolean;
  isReadingFiles: boolean;
  error: ApiError | null;
  onMessageChange: (value: string) => void;
  onFollowUpAnswerChange: (value: string) => void;
  onFilesSelected: (files: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onSubmitInitial: () => void;
  onSubmitFollowUp: () => void;
  onReset: () => void;
};

function UploadedFileChip({
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
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"
      title={file.errorMessage ?? undefined}
    >
      <span className="truncate">{file.name}</span>
      <span
        className={
          file.errorMessage
            ? "font-medium text-destructive"
            : "font-medium text-foreground"
        }
      >
        {file.errorMessage ? "Failed" : file.truncated ? "Truncated" : "Extracted"}
      </span>
      <button
        type="button"
        className="text-foreground hover:text-destructive disabled:opacity-40"
        onClick={() => onRemove(file.id)}
        disabled={disabled}
      >
        <X className="size-3" aria-hidden="true" />
        <span className="sr-only">Remove {file.name}</span>
      </button>
    </span>
  );
}

export function MatchIntakePanel({
  currentStep,
  message,
  followUpAnswer,
  response,
  messages,
  uploadedFiles,
  isSubmitting,
  isReadingFiles,
  error,
  onMessageChange,
  onFollowUpAnswerChange,
  onFilesSelected,
  onRemoveFile,
  onSubmitInitial,
  onSubmitFollowUp,
  onReset,
}: MatchIntakePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const needsFollowUp = response?.status === "needs_follow_up";
  const canSubmitInitial =
    (message.trim().length > 0 || uploadedFiles.length > 0) &&
    !isSubmitting &&
    !isReadingFiles;
  const canSubmitFollowUp = followUpAnswer.trim().length > 0 && !isSubmitting;

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Matching workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              Describe, clarify, match
            </h1>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onReset}>
            <RotateCcw aria-hidden="true" />
            <span className="sr-only">Reset</span>
          </Button>
        </div>

        <WorkspaceStepper currentStep={currentStep} />
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto border-y border-border bg-background p-4">
        {messages.map((item) => (
          <div
            key={item.id}
            className={
              item.role === "user"
                ? "ml-auto max-w-[86%] rounded-lg bg-primary px-4 py-3 text-primary-foreground"
                : "max-w-[86%] rounded-lg border border-border bg-card px-4 py-3 text-foreground"
            }
          >
            <p className="whitespace-pre-wrap text-sm leading-6">{item.content}</p>
          </div>
        ))}
        {isSubmitting ? (
          <div className="max-w-[86%] rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Extracting profile and retrieving investor evidence.
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <Label htmlFor="founder-message">Company description</Label>
        <Textarea
          id="founder-message"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="Paste a founder blurb, raise note, or attach a deck/profile."
          className="min-h-36 resize-y bg-background leading-6"
          disabled={isSubmitting || needsFollowUp}
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            id="founder-file-upload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
            disabled={isSubmitting || isReadingFiles || needsFollowUp}
          >
            <Paperclip aria-hidden="true" />
            {isReadingFiles ? "Reading" : "Attach file"}
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
      </div>

      {error ? (
        <div className="mx-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 px-4 pb-4">
        <Button
          type="button"
          size="lg"
          onClick={onSubmitInitial}
          disabled={!canSubmitInitial || needsFollowUp}
        >
          <Sparkles aria-hidden="true" />
          {isSubmitting ? "Running" : "Extract and match"}
        </Button>
      </div>

      {needsFollowUp ? (
        <div className="mx-4 mb-4 rounded-lg border border-primary/15 bg-background p-4">
          <p className="text-sm font-medium text-foreground">
            {response.follow_up_question}
          </p>
          <div className="mt-4 space-y-3">
            <Label htmlFor="follow-up-answer">Clarifying answer</Label>
            <Textarea
              id="follow-up-answer"
              value={followUpAnswer}
              onChange={(event) => onFollowUpAnswerChange(event.target.value)}
              className="min-h-24 bg-card leading-6"
              disabled={isSubmitting}
            />
          </div>
          <Button
            type="button"
            className="mt-4"
            onClick={onSubmitFollowUp}
            disabled={!canSubmitFollowUp}
          >
            <Send aria-hidden="true" />
            Continue matching
          </Button>
        </div>
      ) : null}
    </section>
  );
}
