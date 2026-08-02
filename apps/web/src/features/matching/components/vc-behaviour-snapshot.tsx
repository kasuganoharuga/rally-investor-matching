import type { BehaviourProfile } from "./vc-behaviour-profile";

export function VcBehaviourSnapshot({ profile }: { profile: BehaviourProfile }) {
  return (
    <section className="rounded-lg border border-primary bg-card p-6 shadow-sm">
      <p className="max-w-2xl font-serif text-xl leading-8 text-foreground">
        {profile.headline}
      </p>

      {profile.chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <dl className="mt-6 space-y-4 border-t border-border pt-5">
        {profile.metrics.map((metric) => (
          <div
            key={metric.label}
            className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[132px_minmax(0,1fr)]"
          >
            <dt className="text-xs font-semibold uppercase text-muted-foreground/70 sm:pt-0.5">
              {metric.label}
            </dt>
            <dd className="min-w-0">
              <span className="text-sm font-semibold text-foreground">
                {metric.value}
              </span>
              {metric.note ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {metric.note}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
