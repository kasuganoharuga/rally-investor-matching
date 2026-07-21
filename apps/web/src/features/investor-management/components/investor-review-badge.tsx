import type { ManagedInvestor } from "@/features/investor-management/types/investor-management";
import {
  reviewStatusClass,
  reviewStatusLabel,
} from "@/features/investor-management/components/investor-management-format";
import { cn } from "@/lib/utils";

export function InvestorReviewBadge({
  status,
  className,
}: {
  status: ManagedInvestor["reviewStatus"];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        reviewStatusClass(status),
        className,
      )}
    >
      {reviewStatusLabel(status)}
    </span>
  );
}
