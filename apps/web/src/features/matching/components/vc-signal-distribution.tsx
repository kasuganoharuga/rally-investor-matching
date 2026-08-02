import { Progress } from "@/components/ui/progress";

import { labelFromCode, type WeightedSignal } from "./vc-detail-utils";

export function VcSignalDistribution({
  title,
  signals,
}: {
  title: string;
  signals: WeightedSignal[];
}) {
  if (signals.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground/70">
        {title}
      </p>
      <div className="mt-3 space-y-2.5">
        {signals.map((signal) => {
          const percent = signal.value * 100;
          return (
            <div key={signal.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">
                  {labelFromCode(signal.label)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {percent < 1 ? "<1%" : `${Math.round(percent)}%`}
                </span>
              </div>
              <Progress value={percent} className="gap-0" trackClassName="h-1.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
