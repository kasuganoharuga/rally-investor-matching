import { cn } from "@/lib/utils";

export type WorkspaceView = "new-match" | "history";

export function WorkspaceSubnav({
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
