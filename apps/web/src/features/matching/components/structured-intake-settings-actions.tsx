import { Globe, Loader2, Save, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/features/auth/types/auth";
import type { MatchingSettings } from "@/features/matching/types/matching-settings";

export function StructuredIntakeSettingsActions({
  userRole,
  source,
  isBusy,
  isSaving,
  hasUnsavedSettings,
  hasValidTotal,
  onSave,
  onDiscard,
  onReset,
}: {
  userRole: UserRole;
  source: MatchingSettings["source"];
  isBusy: boolean;
  isSaving: boolean;
  hasUnsavedSettings: boolean;
  hasValidTotal: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
}) {
  const isAdmin = userRole === "admin";
  return (
    <section className="border-b border-border bg-primary/5 p-5 md:p-7">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {isAdmin ? <Globe className="size-4" /> : <UserRound className="size-4" />}
        {isAdmin ? "Global score weights" : "Your score weights"}
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        {isAdmin
          ? "Publishing saves these score weights for everyone's future matches. Reviewers with personal weights keep their own overrides."
          : "Save your own score weights for future matches. Your changes only affect your matches, never anyone else's."}{" "}
        Saved match history is never recalculated.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Eligibility rules, investor exclusions and result count below apply to this
        match only.
      </p>
      <p className="mt-2 text-xs font-medium" role="status" aria-live="polite">
        {hasUnsavedSettings
          ? "Unsaved score weights — save or discard before running a match."
          : source === "personal"
            ? "Using your saved personal score weights."
            : "Using the published global score weights."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={isBusy || !hasUnsavedSettings || !hasValidTotal}
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {isAdmin ? "Publish for everyone" : "Save my score weights"}
        </Button>
        {hasUnsavedSettings ? (
          <Button type="button" variant="outline" onClick={onDiscard} disabled={isBusy}>
            Discard changes
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          disabled={isBusy || (!isAdmin && source === "global" && !hasUnsavedSettings)}
        >
          {isAdmin ? "Load original weights" : "Use global weights"}
        </Button>
      </div>
      {isAdmin ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Loading original weights only changes this draft until you publish.
        </p>
      ) : null}
    </section>
  );
}
