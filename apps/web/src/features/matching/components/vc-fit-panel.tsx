import { Check, Minus } from "lucide-react";

import type { BehaviourProfile } from "./vc-behaviour-profile";

/**
 * The founder-facing answer. Lives in the overview's right rail and sticks on
 * desktop so "should I spend an intro on this investor" stays on screen while
 * the reader scrolls the supporting stage table.
 */
export function VcFitPanel({
  profile,
  onViewEvidence,
}: {
  profile: BehaviourProfile;
  onViewEvidence?: () => void;
}) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Check className="size-4 text-primary" aria-hidden="true" />
          Best suited for
        </h2>
        <ul className="mt-3 space-y-2">
          {profile.bestFit.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-border pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Minus className="size-4" aria-hidden="true" />
            Less evidence
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {profile.lessProven.join(" · ")}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground/80">
            No observed deals here — missing evidence, not a stated exclusion.
          </p>
        </div>
      </section>

      {profile.strongestThemes.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xs font-semibold uppercase text-muted-foreground/70">
            Strongest themes
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {profile.strongestThemes.join(" · ")}
          </p>
          {onViewEvidence ? (
            <button
              type="button"
              onClick={onViewEvidence}
              className="mt-3 text-sm font-semibold text-primary transition hover:underline"
            >
              View full sector and theme evidence →
            </button>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
