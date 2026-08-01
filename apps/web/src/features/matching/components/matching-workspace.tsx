"use client";

import { useState } from "react";

import { ClarifyFollowUpScreen } from "@/features/matching/components/clarify-follow-up-screen";
import { FreeTextIntakeScreen } from "@/features/matching/components/free-text-intake-screen";
import { MatchDetailPanel } from "@/features/matching/components/match-detail-panel";
import { MatchHistoryScreen } from "@/features/matching/components/match-history-screen";
import { MatchingProgressScreen } from "@/features/matching/components/matching-progress-screen";
import { MatchResultsScreen } from "@/features/matching/components/match-results-screen";
import { StructuredIntakeScreen } from "@/features/matching/components/structured-intake-screen";
import {
  WorkspaceSubnav,
  type WorkspaceView,
} from "@/features/matching/components/workspace-subnav";
import { useMatchIntake } from "@/features/matching/hooks/use-match-intake";
import type { MatchingConfiguration } from "@/features/matching/types/match";

export type MatchIntakeVariant = "structured" | "free-text";

export function MatchingWorkspace({
  intakeVariant = "structured",
}: {
  intakeVariant?: MatchIntakeVariant;
}) {
  const intake = useMatchIntake();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("new-match");
  const matches = intake.response?.matches ?? [];
  const selectedMatchIsValid = matches.some(
    (match) => match.investor_id === selectedMatchId,
  );

  function submitInitial(
    messageOverride?: string,
    matchingConfiguration?: MatchingConfiguration,
  ) {
    setSelectedMatchId(null);
    void intake.submitInitial(messageOverride, matchingConfiguration);
  }

  function submitFollowUp() {
    setSelectedMatchId(null);
    void intake.submitFollowUp();
  }

  function resetWorkspace() {
    setSelectedMatchId(null);
    setWorkspaceView("new-match");
    intake.reset();
  }

  const selectedMatch =
    matches.find((match) => match.investor_id === selectedMatchId) ?? null;
  const needsFollowUp = intake.response?.status === "needs_follow_up";
  const errorMessage = intake.error?.message ?? null;

  function renderContent() {
    if (workspaceView === "history") {
      return (
        <MatchHistoryScreen
          records={intake.records}
          onBackToNewMatch={() => setWorkspaceView("new-match")}
          onSelectRecord={(record) => {
            intake.selectRecord(record);
            setSelectedMatchId(null);
            setWorkspaceView("new-match");
          }}
        />
      );
    }

    if (selectedMatch && selectedMatchIsValid) {
      const companyName =
        typeof intake.response?.parsed_company_profile.company_name === "string"
          ? intake.response.parsed_company_profile.company_name
          : "this company";
      return (
        <MatchDetailPanel
          match={selectedMatch}
          companyName={companyName}
          onBack={() => setSelectedMatchId(null)}
        />
      );
    }

    if (intake.isSubmitting) {
      return <MatchingProgressScreen />;
    }

    if (matches.length > 0 && intake.response) {
      return (
        <MatchResultsScreen
          response={intake.response}
          onSelectMatch={(investorId) => setSelectedMatchId(investorId)}
          onStartOver={resetWorkspace}
        />
      );
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
          onSubmit={() => submitInitial()}
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
      <WorkspaceSubnav
        view={workspaceView}
        onViewChange={(view) => {
          if (view === "history") {
            void intake.refreshHistory();
          }
          setWorkspaceView(view);
          setSelectedMatchId(null);
        }}
        recordCount={intake.records.length}
      />
      {renderContent()}
    </div>
  );
}
