import type { ManagedInvestor } from "@/features/investor-management/types/investor-management";
import {
  compactAmount,
  initials,
  investorTypeLabel,
  titleCase,
} from "@/features/investors/components/investor-detail-format";

export { initials, investorTypeLabel, titleCase };

export function investorLocation(investor: ManagedInvestor): string {
  const location = [investor.hqCity, investor.hqState, investor.hqCountry].filter(
    Boolean,
  );
  return location.length > 0 ? location.join(", ") : "Location pending";
}

export function confidencePercent(value: number | null): number {
  if (value === null) return 0;
  return Math.round(value <= 1 ? value * 100 : value);
}

export function formatDate(value: string | null): string {
  if (!value) return "Not reviewed";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function chequeLabel(min: number | null, max: number | null): string {
  const lower = min === null ? null : compactAmount(min, "USD");
  const upper = max === null ? null : compactAmount(max, "USD");
  if (lower && upper) return `${lower}-${upper.replace("US$", "")}`;
  if (lower) return `${lower}+`;
  if (upper) return `Up to ${upper}`;
  return "Not observed";
}

export function reviewStatusLabel(status: ManagedInvestor["reviewStatus"]): string {
  if (status === "unreviewed") return "Needs review";
  if (status === "needs_more_data") return "Needs more data";
  if (status === "approved") return "Reviewed";
  if (status === "corrected") return "Reviewed with edits";
  return "Rejected";
}

export function reviewStatusClass(status: ManagedInvestor["reviewStatus"]): string {
  if (status === "unreviewed") return "border-amber-300 bg-amber-50 text-amber-900";
  if (status === "needs_more_data") {
    return "border-orange-300 bg-orange-50 text-orange-900";
  }
  if (status === "approved" || status === "corrected") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
}
