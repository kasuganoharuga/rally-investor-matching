"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ClarifyFollowUpScreen } from "@/features/matching/components/clarify-follow-up-screen";
import { FreeTextIntakeScreen } from "@/features/matching/components/free-text-intake-screen";
import { MatchingProgressScreen } from "@/features/matching/components/matching-progress-screen";
import { StructuredIntakeScreen } from "@/features/matching/components/structured-intake-screen";
import { WorkspaceSubnav } from "@/features/matching/components/workspace-subnav";
import { useMatchIntake } from "@/features/matching/hooks/use-match-intake";
import type { MatchingConfiguration } from "@/features/matching/types/match";

export type MatchIntakeVariant = "structured" | "free-text";

function NoMatchesScreen({ onStartOver }: { onStartOver: () => void }) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-10 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        No investor matches yet
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        We extracted your profile, but nothing in the investor database cleared the
        eligibility bar yet. Try adding more detail about your stage, sector, and
        geography.
      </p>
      <Button type="button" size="lg" className="mt-6" onClick={onStartOver}>
        Start over
      </Button>
    </section>
  );
}

export function MatchingWorkspace({
  intakeVariant = "structured",
}: {
  intakeVariant?: MatchIntakeVariant;
}) {
  const intake = useMatchIntake();
  const router = useRouter();
  const needsFollowUp = intake.response?.status === "needs_follow_up";
  const hasZeroMatches =
    Boolean(intake.response) && !needsFollowUp && intake.response!.matches.length === 0;
  const errorMessage = intake.error?.message ?? null;

  async function submitInitial(
    messageOverride?: string,
    matchingConfiguration?: MatchingConfiguration,
  ) {
    const result = await intake.submitInitial(messageOverride, matchingConfiguration);
    if (result?.record) {
      router.push(`/match/${result.record.id}`);
    }
  }

  async function submitFollowUp() {
    const result = await intake.submitFollowUp();
    if (result?.record) {
      router.push(`/match/${result.record.id}`);
    }
  }

  function resetWorkspace() {
    intake.reset();
  }

  function renderContent() {
    if (intake.isSubmitting) {
      return <MatchingProgressScreen />;
    }

    if (hasZeroMatches) {
      return <NoMatchesScreen onStartOver={resetWorkspace} />;
    }

    if (needsFollowUp) {
      return (
        <ClarifyFollowUpScreen
          question={
            intake.response?.follow_up_question ??
            "Could you share the missing company context?"
          }
          answer={intake.followUpAnswer}
          isSubmitting={intake.isSubmitting}
          errorMessage={errorMessage}
          onAnswerChange={intake.updateFollowUpAnswer}
          onSubmit={submitFollowUp}
          onBack={resetWorkspace}
        />
      );
    }

    if (intakeVariant === "free-text") {
      return (
        <FreeTextIntakeScreen
          message={intake.message}
          uploadedFiles={intake.uploadedFiles}
          isSubmitting={intake.isSubmitting}
          isReadingFiles={intake.isReadingFiles}
          errorMessage={errorMessage}
          onMessageChange={intake.updateMessage}
          onFilesSelected={intake.addFiles}
          onRemoveFile={intake.removeFile}
          onSubmit={() => void submitInitial()}
        />
      );
    }

    return (
      <StructuredIntakeScreen
        isSubmitting={intake.isSubmitting}
        errorMessage={errorMessage}
        onSubmit={submitInitial}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceSubnav recordCount={intake.records.length} />
      {renderContent()}
    </div>
  );
}
