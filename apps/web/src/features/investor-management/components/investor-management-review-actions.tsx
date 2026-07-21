"use client";

import { useState } from "react";
import { CheckCircle2, FlagTriangleRight, Loader2 } from "lucide-react";

import type {
  ManagedInvestor,
  UpdateInvestorReviewInput,
} from "@/features/investor-management/types/investor-management";
import type { ApiError } from "@/lib/api/errors";

type ReviewResult = { data: ManagedInvestor | null; error: ApiError | null };

export function InvestorManagementReviewActions({
  investor,
  onReview,
}: {
  investor: ManagedInvestor;
  onReview: (id: string, input: UpdateInvestorReviewInput) => Promise<ReviewResult>;
}) {
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(reviewStatus: "approved" | "needs_more_data") {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    const result = await onReview(investor.id, {
      reviewStatus,
      note: note.trim() || null,
    });
    setIsSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNote("");
    setMessage(
      reviewStatus === "approved"
        ? "Investor marked as reviewed."
        : "Investor flagged for more data.",
    );
  }

  return (
    <section className="rounded-md border bg-muted/20 p-3">
      <h3 className="text-sm font-semibold">Review decision</h3>
      <textarea
        aria-label="Review note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        placeholder="Add an optional note for the audit history..."
        className="mt-3 min-h-20 w-full resize-y rounded-md border bg-background p-2.5 text-sm outline-none focus:border-primary"
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void submit("approved")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Mark reviewed
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void submit("needs_more_data")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 disabled:opacity-60"
        >
          <FlagTriangleRight className="size-4" />
          Needs more data
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-xs font-medium text-emerald-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </section>
  );
}
