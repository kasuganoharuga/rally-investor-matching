"use client";

import { useState } from "react";

import { MatchIntakePanel } from "@/features/matching/components/match-intake-panel";
import { MatchResultsPanel } from "@/features/matching/components/match-results-panel";
import type { WorkspaceStep } from "@/features/matching/components/workspace-stepper";
import { useMatchIntake } from "@/features/matching/hooks/use-match-intake";

export function MatchingWorkspace() {
  const intake = useMatchIntake();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const matches = intake.response?.matches ?? [];
  const selectedMatchIsValid = matches.some(
    (match) => match.investor_id === selectedMatchId,
  );

  function submitInitial() {
    setSelectedMatchId(null);
    void intake.submitInitial();
  }

  function submitFollowUp() {
    setSelectedMatchId(null);
    void intake.submitFollowUp();
  }

  let currentStep: WorkspaceStep = "describe";
  if (intake.isSubmitting) {
    currentStep = "match";
  } else if (selectedMatchId && selectedMatchIsValid) {
    currentStep = "detail";
  } else if (matches.length > 0) {
    currentStep = "results";
  } else if (intake.response?.status === "needs_follow_up") {
    currentStep = "clarify";
  }

  function resetWorkspace() {
    setSelectedMatchId(null);
    intake.reset();
  }

  if (currentStep === "detail") {
    return (
      <MatchResultsPanel
        response={intake.response}
        records={intake.records}
        isSubmitting={intake.isSubmitting}
        selectedMatchId={selectedMatchId}
        onSelectMatch={setSelectedMatchId}
        onBackToResults={() => setSelectedMatchId(null)}
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.78fr)_minmax(0,1.22fr)]">
      <div className="xl:sticky xl:top-5 xl:self-start">
        <MatchIntakePanel
          currentStep={currentStep}
          message={intake.message}
          followUpAnswer={intake.followUpAnswer}
          response={intake.response}
          messages={intake.messages}
          uploadedFiles={intake.uploadedFiles}
          isSubmitting={intake.isSubmitting}
          isReadingFiles={intake.isReadingFiles}
          error={intake.error}
          onMessageChange={intake.updateMessage}
          onFollowUpAnswerChange={intake.updateFollowUpAnswer}
          onFilesSelected={intake.addFiles}
          onRemoveFile={intake.removeFile}
          onSubmitInitial={submitInitial}
          onSubmitFollowUp={submitFollowUp}
          onReset={resetWorkspace}
        />
      </div>

      <MatchResultsPanel
        response={intake.response}
        records={intake.records}
        isSubmitting={intake.isSubmitting}
        selectedMatchId={selectedMatchId}
        onSelectMatch={setSelectedMatchId}
        onBackToResults={() => setSelectedMatchId(null)}
      />
    </div>
  );
}
