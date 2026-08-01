import { MessageSquareText } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";

export function StructuredIntakeContextFields({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <section className="border-t border-border p-5 md:p-7">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <MessageSquareText className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Additional company context
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional details not covered by the selected fields.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        <label
          htmlFor="company-summary"
          className="text-sm font-semibold text-foreground"
        >
          Company summary
          <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="company-summary"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder="Add product, traction, or fundraising context that may improve the match."
          className="min-h-28 resize-y"
        />
      </div>
    </section>
  );
}
