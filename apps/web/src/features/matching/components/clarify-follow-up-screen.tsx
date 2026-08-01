import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WorkflowStepper } from "@/features/matching/components/workflow-stepper";

export function ClarifyFollowUpScreen({
  question,
  answer,
  isSubmitting,
  errorMessage,
  onAnswerChange,
  onSubmit,
  onBack,
}: {
  question: string;
  answer: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to workspace
      </button>

      <div className="rounded-lg border border-border bg-card p-6 shadow-xl shadow-foreground/5">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
          <span className="size-2 rounded-full bg-secondary" />
          Step 2 of 4 · Confirm key signals
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          We need one more detail
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{question}</p>
        <Textarea
          value={answer}
          onChange={(event) => onAnswerChange(event.target.value)}
          className="mt-5 min-h-28 resize-none bg-background leading-6"
          placeholder="Add the missing context here."
          disabled={isSubmitting}
        />
        {errorMessage ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <Button
          type="button"
          size="lg"
          className="mt-5 bg-secondary text-secondary-foreground hover:bg-secondary/85"
          onClick={onSubmit}
          disabled={answer.trim().length === 0 || isSubmitting}
        >
          Continue matching
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-8">
        <WorkflowStepper activeIndex={1} />
      </div>
    </section>
  );
}
