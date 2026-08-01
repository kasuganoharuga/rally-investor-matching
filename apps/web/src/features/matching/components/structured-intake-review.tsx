import { StructuredIntakeReviewCompany } from "@/features/matching/components/structured-intake-review-company";
import { StructuredIntakeReviewSignals } from "@/features/matching/components/structured-intake-review-signals";
import type { StructuredIntakeValues } from "@/features/matching/types/structured-intake";

export function StructuredIntakeReview({
  values,
  onEditCompany,
  onEditSignals,
}: {
  values: StructuredIntakeValues;
  onEditCompany: () => void;
  onEditSignals: () => void;
}) {
  return (
    <div className="divide-y divide-border">
      <StructuredIntakeReviewCompany values={values} onEdit={onEditCompany} />
      <StructuredIntakeReviewSignals values={values} onEdit={onEditSignals} />
    </div>
  );
}
