"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MatchDetailPanel } from "@/features/matching/components/match-detail-panel";
import { MatchHistoryPanel } from "@/features/matching/components/match-history-panel";
import { VcDetailPanel } from "@/features/matching/components/vc-detail-panel";
import { useMatchIntake } from "@/features/matching/hooks/use-match-intake";
import type {
  MatchRecord,
  UploadedFounderFile,
} from "@/features/matching/hooks/use-match-intake";
import type { IntakeResponse, MatchResult } from "@/features/matching/types/match";
import { cn } from "@/lib/utils";

type WorkspaceView = "new-match" | "history";
type SelectedMatchView = "match-detail" | "vc-profile";

const PROMPT_CHIPS = [
  '"We\'re pre-seed, building..."',
  '"Raising AUD $1.5M for..."',
  '"We\'re looking for ANZ seed investors..."',
];

const WORKFLOW_STEPS = [
  "Describe your raise",
  "Confirm key signals",
  "Get ranked matches",
  "Review intro paths",
];

function NewMatchSubnav({
  view,
  onViewChange,
  recordCount,
}: {
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
  recordCount: number;
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-7 px-6">
        {(
          [
            ["new-match", "New match"],
            ["history", "Match history"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={cn(
              "py-4 text-sm font-semibold transition",
              view === id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {id === "history" && recordCount > 0 ? (
              <span className="ml-1 text-xs text-muted-foreground">
                ({recordCount})
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

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
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
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
        className="text-foreground/70 hover:text-destructive disabled:opacity-40"
        onClick={() => onRemove(file.id)}
        disabled={disabled}
      >
        <X className="size-3" aria-hidden="true" />
        <span className="sr-only">Remove {file.name}</span>
      </button>
    </span>
  );
}

function HorizontalStepper({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-3 text-sm">
      {WORKFLOW_STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex size-5 items-center justify-center rounded-full border text-xs font-semibold",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isDone
                    ? "border-primary bg-secondary text-secondary-foreground"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {isDone ? <Check className="size-3" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={cn(
                "font-semibold",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
            {index < WORKFLOW_STEPS.length - 1 ? (
              <span className="text-muted-foreground">→</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function IntakeScreen({
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
    <section className="mx-auto flex min-h-[calc(100vh-164px)] w-full max-w-3xl flex-col items-center justify-center px-5 py-10 text-center">
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
        <HorizontalStepper activeIndex={0} />
      </div>
    </section>
  );
}

function ClarifyScreen({
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
    <section className="mx-auto flex min-h-[calc(100vh-164px)] w-full max-w-2xl flex-col justify-center px-5 py-10">
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
        <HorizontalStepper activeIndex={1} />
      </div>
    </section>
  );
}

function MatchingProgressScreen() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-164px)] w-full max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-card shadow-lg">
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-foreground">
        Building your ranked investor matches
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Extracting key founder signals, checking investor eligibility, and scoring the
        strongest evidence-backed fits.
      </p>
      <div className="mt-7 grid w-full gap-2 sm:grid-cols-3">
        {["Profile signals", "Investor evidence", "Fit scoring"].map((item, index) => (
          <div
            key={item}
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
          >
            <span className="mb-2 block text-xs text-muted-foreground">
              0{index + 1}
            </span>
            {item}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <HorizontalStepper activeIndex={2} />
      </div>
    </section>
  );
}

function scoreTier(score: number): "strong" | "possible" | "weak" {
  if (score >= 80) {
    return "strong";
  }
  if (score >= 60) {
    return "possible";
  }
  return "weak";
}

function tierLabel(match: MatchResult): string {
  const tier = match.match_tier?.replaceAll("_", " ");
  if (tier) {
    return tier;
  }
  const score = scoreTier(match.score);
  if (score === "strong") {
    return "Strong fit";
  }
  if (score === "possible") {
    return "Possible fit";
  }
  return "Weak fit";
}

function signalPills(
  match: MatchResult,
): { label: string; tone: "good" | "warn" | "bad" }[] {
  const factorMax: Record<string, number> = {
    stage_evidence_depth: 10,
    geography_fit: 5,
    sector_fit: 15,
    theme_fit: 25,
    recent_deal_similarity: 20,
    customer_icp_fit: 10,
    cheque_size_fit: 5,
    lead_behavior_fit: 5,
    data_quality_recency: 5,
  };
  const factorOrder = [
    "stage_evidence_depth",
    "sector_fit",
    "theme_fit",
    "recent_deal_similarity",
    "lead_behavior_fit",
    "cheque_size_fit",
  ];
  const entries = factorOrder
    .filter((key) => key in match.breakdown)
    .map((key) => [key, match.breakdown[key]] as const);
  const pills = entries.slice(0, 4).map(([key, value]) => {
    const labels: Record<string, string> = {
      stage_evidence_depth: "Stage evidence",
      geography_fit: "AU/NZ",
      sector_fit: "Sector",
      theme_fit: "Theme",
      recent_deal_similarity: "Deal evidence",
      customer_icp_fit: "ICP",
      cheque_size_fit: "Cheque",
      lead_behavior_fit: "Lead",
      data_quality_recency: "Recency",
    };
    const short = labels[key] ?? key.replaceAll("_", " ");
    const ratio = factorMax[key] ? value / factorMax[key] : 0;
    const isGood = ratio >= 0.65;
    return {
      label: isGood ? `${short} match` : `${short} partial`,
      tone: isGood ? "good" : "warn",
    } as const;
  });
  if (pills.length > 0) {
    return pills;
  }
  return match.strengths.slice(0, 3).map((item) => ({ label: item, tone: "good" }));
}

function evidenceLine(match: MatchResult): string {
  const recentDeals = match.investor_profile?.recent_deals ?? [];
  const deals = recentDeals
    .slice(0, 2)
    .map((deal) => {
      const year = deal.date?.slice(0, 4);
      return [deal.company, deal.amount_text, year].filter(Boolean).join(" ");
    })
    .filter(Boolean);
  if (deals.length > 0) {
    return `Recent evidence includes ${deals.join(" and ")}.`;
  }
  return match.strengths[0] ?? "Open the profile to review the available evidence.";
}

function ScoreRing({ score }: { score: number }) {
  const tier = scoreTier(score);
  return (
    <div
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-full border-4 bg-card text-sm font-bold text-foreground",
        tier === "strong"
          ? "border-emerald-500"
          : tier === "possible"
            ? "border-amber-500"
            : "border-muted-foreground/40",
      )}
    >
      {Math.round(score)}
    </div>
  );
}

function ResultsScreen({
  response,
  onSelectMatch,
  onStartOver,
}: {
  response: IntakeResponse;
  onSelectMatch: (investorId: string) => void;
  onStartOver: () => void;
}) {
  const matches = response.matches;
  const strongCount = matches.filter(
    (match) => scoreTier(match.score) === "strong",
  ).length;
  const possibleCount = matches.filter(
    (match) => scoreTier(match.score) === "possible",
  ).length;
  const weakCount = matches.length - strongCount - possibleCount;
  const companyName =
    typeof response.parsed_company_profile.company_name === "string"
      ? response.parsed_company_profile.company_name
      : "Current company";

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-5">
      <button
        type="button"
        onClick={onStartOver}
        className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Workspace
      </button>

      <div className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {matches.length} investor matches found
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Top matches are ranked by evidence-backed fit across stage, sector,
              geography, cheque size, and lead behaviour.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                • {strongCount} strong fit
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                • {possibleCount} possible
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                • {weakCount} weak
              </span>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{companyName}</p>
            <p>Matched {new Intl.DateTimeFormat("en-AU").format(new Date())}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-primary pb-3">
        <div className="flex flex-wrap gap-2">
          {[
            "All",
            "Strong fit",
            "Lead potential",
            "Has warm intro",
            "Needs review",
          ].map((item, index) => (
            <span
              key={item}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold",
                index === 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {item}
              {index === 0 ? ` (${matches.length})` : ""}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Sort by: <span className="font-semibold text-foreground">Best fit</span>
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {matches.map((match) => (
          <button
            key={match.investor_id}
            type="button"
            onClick={() => onSelectMatch(match.investor_id)}
            className={cn(
              "w-full rounded-lg border bg-card px-5 py-4 text-left shadow-sm transition hover:border-primary hover:shadow-md",
              match.rank === 1 ? "border-primary" : "border-border",
            )}
          >
            <div className="flex items-start gap-4">
              <ScoreRing score={match.score} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {match.investor_name}
                  </h2>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                      scoreTier(match.score) === "strong"
                        ? "bg-secondary text-secondary-foreground"
                        : scoreTier(match.score) === "possible"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tierLabel(match)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {match.strengths[0] ??
                    "Potential investor fit based on available profile data."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    Signals
                  </span>
                  {signalPills(match).map((pill) => (
                    <span
                      key={pill.label}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        pill.tone === "good"
                          ? "border-border bg-background text-muted-foreground"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                      )}
                    >
                      {pill.label}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-bold uppercase text-muted-foreground/70">
                    Evidence{" "}
                  </span>
                  {evidenceLine(match)}
                </p>
              </div>
              <div className="hidden min-w-44 text-right text-xs font-semibold text-muted-foreground md:block">
                {match.investor_profile?.warm_intro_available ? (
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-secondary-foreground">
                    • Intro path available
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1.5">
                    • Relationship unknown
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function HistoryScreen({
  records,
  onBackToNewMatch,
  onSelectRecord,
}: {
  records: MatchRecord[];
  onBackToNewMatch: () => void;
  onSelectRecord: (record: MatchRecord) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Match history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent matches saved to your account.
          </p>
        </div>
        <Button type="button" onClick={onBackToNewMatch}>
          New match
        </Button>
      </div>
      <MatchHistoryPanel records={records} onSelectRecord={onSelectRecord} />
    </section>
  );
}

export function MatchingWorkspace() {
  const intake = useMatchIntake();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatchView, setSelectedMatchView] =
    useState<SelectedMatchView>("match-detail");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("new-match");
  const matches = intake.response?.matches ?? [];
  const selectedMatchIsValid = matches.some(
    (match) => match.investor_id === selectedMatchId,
  );

  function submitInitial() {
    setSelectedMatchId(null);
    setSelectedMatchView("match-detail");
    void intake.submitInitial();
  }

  function submitFollowUp() {
    setSelectedMatchId(null);
    setSelectedMatchView("match-detail");
    void intake.submitFollowUp();
  }

  function resetWorkspace() {
    setSelectedMatchId(null);
    setSelectedMatchView("match-detail");
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
        <HistoryScreen
          records={intake.records}
          onBackToNewMatch={() => setWorkspaceView("new-match")}
          onSelectRecord={(record) => {
            intake.selectRecord(record);
            setSelectedMatchId(null);
            setSelectedMatchView("match-detail");
            setWorkspaceView("new-match");
          }}
        />
      );
    }

    if (selectedMatch && selectedMatchIsValid) {
      if (selectedMatchView === "match-detail") {
        const companyName =
          typeof intake.response?.parsed_company_profile.company_name === "string"
            ? intake.response.parsed_company_profile.company_name
            : "this company";
        return (
          <MatchDetailPanel
            match={selectedMatch}
            companyName={companyName}
            onBack={() => setSelectedMatchId(null)}
            onViewFullProfile={() => setSelectedMatchView("vc-profile")}
          />
        );
      }

      return (
        <div className="mx-auto w-full max-w-[1440px] px-6 py-5">
          <button
            type="button"
            onClick={() => setSelectedMatchView("match-detail")}
            className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to match detail
          </button>
          <VcDetailPanel match={selectedMatch} />
        </div>
      );
    }

    if (intake.isSubmitting) {
      return <MatchingProgressScreen />;
    }

    if (matches.length > 0 && intake.response) {
      return (
        <ResultsScreen
          response={intake.response}
          onSelectMatch={(investorId) => {
            setSelectedMatchId(investorId);
            setSelectedMatchView("match-detail");
          }}
          onStartOver={resetWorkspace}
        />
      );
    }

    if (needsFollowUp) {
      return (
        <ClarifyScreen
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

    return (
      <IntakeScreen
        message={intake.message}
        uploadedFiles={intake.uploadedFiles}
        isSubmitting={intake.isSubmitting}
        isReadingFiles={intake.isReadingFiles}
        errorMessage={errorMessage}
        onMessageChange={intake.updateMessage}
        onFilesSelected={intake.addFiles}
        onRemoveFile={intake.removeFile}
        onSubmit={submitInitial}
      />
    );
  }

  return (
    <>
      <NewMatchSubnav
        view={workspaceView}
        onViewChange={(view) => {
          if (view === "history") {
            void intake.refreshHistory();
          }
          setWorkspaceView(view);
          setSelectedMatchId(null);
          setSelectedMatchView("match-detail");
        }}
        recordCount={intake.records.length}
      />
      {renderContent()}
    </>
  );
}
