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

export function formatCapacityPercent(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}
