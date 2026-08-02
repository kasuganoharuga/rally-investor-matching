import type { MatchInvestorProfile } from "@/features/matching/types/match";

export function titleCase(value: string | null | undefined): string {
  if (!value) {
    return "Not listed";
  }
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
}

export function websiteHost(url: string | null | undefined): string {
  if (!url) {
    return "Website not listed";
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function locationLabel(profile: MatchInvestorProfile | undefined): string {
  const parts = [profile?.hq_city, profile?.hq_state, profile?.hq_country]
    .filter(Boolean)
    .map((item) => titleCase(String(item)));
  return parts.length > 0 ? parts.join(", ") : "Location not listed";
}

export function factorTone(value: number, max: number): "strong" | "partial" | "weak" {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.75) {
    return "strong";
  }
  if (ratio >= 0.45) {
    return "partial";
  }
  return "weak";
}

export function factorLabel(tone: "strong" | "partial" | "weak"): string {
  if (tone === "strong") {
    return "Strong";
  }
  if (tone === "partial") {
    return "Partial";
  }
  return "Weak";
}
