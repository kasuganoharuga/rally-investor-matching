import { FileText, X } from "lucide-react";

import type { UploadedFounderFile } from "@/features/matching/hooks/use-match-intake";
import { cn } from "@/lib/utils";

export function UploadedFileChip({
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
