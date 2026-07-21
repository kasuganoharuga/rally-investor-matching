import type { ManagedCompany } from "@/features/company-management/types/company-management";

const ACRONYMS: Record<string, string> = {
  ai: "AI",
  anz: "ANZ",
  au: "AU",
  b2b: "B2B",
  b2c: "B2C",
  ceo: "CEO",
  cto: "CTO",
  nz: "NZ",
  saas: "SaaS",
  smb: "SMB",
  uk: "UK",
  us: "US",
};

export function labelFromCode(value: string | null | undefined): string {
  if (!value) return "Not specified";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(
      (part) =>
        ACRONYMS[part.toLowerCase()] ?? `${part[0].toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

export function companyInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function companyLocation(company: ManagedCompany): string {
  const parts = [
    company.profile.hqCity,
    company.profile.hqState,
    company.profile.hqCountry,
  ].filter((value): value is string => Boolean(value));
  return parts.length > 0
    ? parts.map(labelFromCode).join(", ")
    : "Location not provided";
}

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: number, currency: string): string {
  const prefix =
    currency === "AUD" ? "A$" : currency === "USD" ? "US$" : `${currency} `;
  const amount =
    value >= 1_000_000
      ? `${Number((value / 1_000_000).toFixed(1))}m`
      : value >= 1_000
        ? `${Number((value / 1_000).toFixed(0))}k`
        : value.toLocaleString("en-AU");
  return `${prefix}${amount}`;
}

export function raiseRange(company: ManagedCompany): string {
  const profile = company.currentMatchingProfile;
  if (!profile) return "No current raise";
  const currency = profile.raiseCurrency ?? "AUD";
  if (profile.raiseAmountMin !== null && profile.raiseAmountMax !== null) {
    return profile.raiseAmountMin === profile.raiseAmountMax
      ? formatMoney(profile.raiseAmountMin, currency)
      : `${formatMoney(profile.raiseAmountMin, currency)} - ${formatMoney(profile.raiseAmountMax, currency)}`;
  }
  if (profile.raiseAmountMin !== null)
    return `${formatMoney(profile.raiseAmountMin, currency)}+`;
  if (profile.raiseAmountMax !== null)
    return `Up to ${formatMoney(profile.raiseAmountMax, currency)}`;
  return "Amount not specified";
}
