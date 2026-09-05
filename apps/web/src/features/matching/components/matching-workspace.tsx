"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/features/auth/types/auth";
import { ClarifyFollowUpScreen } from "@/features/matching/components/clarify-follow-up-screen";
import { FreeTextIntakeScreen } from "@/features/matching/components/free-text-intake-screen";
import { MatchingProgressScreen } from "@/features/matching/components/matching-progress-screen";
import { StructuredIntakeScreen } from "@/features/matching/components/structured-intake-screen";
import { WorkspaceSubnav } from "@/features/matching/components/workspace-subnav";
import { useMatchIntake } from "@/features/matching/hooks/use-match-intake";
import type {
  MatchingConfiguration,
  MatchRecord,
} from "@/features/matching/types/match";
import type { StructuredIntakeValues } from "@/features/matching/types/structured-intake";
import type { MatchingSettings } from "@/features/matching/types/matching-settings";

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
  rematchRecord = null,
  canConfigureMatching,
  userRole,
  matchingSettings,
}: {
  intakeVariant?: MatchIntakeVariant;
  rematchRecord?: MatchRecord | null;
  canConfigureMatching: boolean;
  userRole: UserRole;
  matchingSettings: MatchingSettings;
}) {
  const intake = useMatchIntake();
  const router = useRouter();
  // The intake form is unmounted while a match runs. Keep published/personal
  // settings here so retrying after an API failure never restores a stale revision.
  const [savedSettings, setSavedSettings] = useState(matchingSettings);
  const needsFollowUp = intake.response?.status === "needs_follow_up";
  const hasZeroMatches =
    Boolean(intake.response) && !needsFollowUp && intake.response!.matches.length === 0;
  const errorMessage = intake.error?.message ?? null;

  async function submitInitial(
    messageOverride?: string,
    matchingConfiguration?: MatchingConfiguration,
    structuredIntake?: StructuredIntakeValues,
  ) {
    const result = await intake.submitInitial(
      messageOverride,
      matchingConfiguration,
      structuredIntake,
    );
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

    // A failed match leaves the attempted values on the hook (the form
    // itself was unmounted for the progress screen). Re-seed from them so a
    // retry starts from what the founder typed, on the step they submitted
    // from — where the error banner and the Run match button both are —
    // rather than an empty step 1.
    const failedAttempt = intake.error ? intake.structuredIntake : null;
    const seededValues = rematchRecord?.structuredIntake ?? failedAttempt ?? undefined;
    const seededConfiguration =
      rematchRecord?.matchingConfiguration ??
      (intake.error ? (intake.matchingConfiguration ?? undefined) : undefined);

    return (
      <StructuredIntakeScreen
        key={rematchRecord?.id ?? "new-match"}
        isSubmitting={intake.isSubmitting}
        errorMessage={errorMessage}
        initialValues={seededValues}
        initialSettings={savedSettings}
        onSettingsSaved={setSavedSettings}
        initialConfiguration={seededConfiguration}
        userRole={userRole}
        initialStep={rematchRecord ? 2 : failedAttempt ? 3 : 0}
        showScoringStep={canConfigureMatching}
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
