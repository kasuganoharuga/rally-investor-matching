import type { StructuredIntakeValues } from "@/features/matching/types/structured-intake";

type StageChequeEstimate = {
  leadAud: number;
  nonLeadAud: number;
};

const STAGE_CHEQUE_ESTIMATES: Record<string, StageChequeEstimate> = {
  pre_seed: { leadAud: 300_000, nonLeadAud: 30_000 },
  seed: { leadAud: 1_125_000, nonLeadAud: 150_000 },
  series_a: { leadAud: 6_000_000, nonLeadAud: 1_250_000 },
  series_b: { leadAud: 17_500_000, nonLeadAud: 3_500_000 },
};

// The funding matrix is denominated in AUD. These planning rates keep the
// coverage judgement comparable when a founder enters an NZD or USD target;
// the result remains an estimate rather than a live foreign-exchange quote.
const TARGET_CURRENCY_TO_AUD: Record<string, number> = {
  AUD: 1,
  NZD: 0.92,
  USD: 1.53,
};

export type InvestmentCapacityEstimate = {
  matchedAmount: number;
  targetAmount: number;
  currency: string;
  isEnough: boolean;
};

export function estimateInvestmentCapacity(
  matchCount: number,
  intake: StructuredIntakeValues | null,
): InvestmentCapacityEstimate | null {
  if (!intake || matchCount < 1) {
    return null;
  }

  const chequeEstimate = STAGE_CHEQUE_ESTIMATES[intake.stage];
  const currencyToAud = TARGET_CURRENCY_TO_AUD[intake.raiseCurrency];
  const targetAmount = Number(intake.raiseAmount);
  if (
    !chequeEstimate ||
    !currencyToAud ||
    !Number.isFinite(targetAmount) ||
    targetAmount <= 0
  ) {
    return null;
  }

  const capacityAud =
    chequeEstimate.leadAud + Math.max(matchCount - 1, 0) * chequeEstimate.nonLeadAud;
  const matchedAmount = capacityAud / currencyToAud;

  return {
    matchedAmount,
    targetAmount,
    currency: intake.raiseCurrency,
    isEnough: matchedAmount >= targetAmount,
  };
}

const CURRENCY_PREFIXES: Record<string, string> = {
  AUD: "A$",
  NZD: "NZ$",
  USD: "US$",
};

export function formatCompactCurrency(value: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-AU", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
  return `${CURRENCY_PREFIXES[currency] ?? `${currency} `}${amount}`;
}
