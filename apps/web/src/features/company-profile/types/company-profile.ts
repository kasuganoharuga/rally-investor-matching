import { z } from "zod";

// 1. Form values: what CompanyProfileForm's inputs bind to. Every field is
// a plain string (React Hook Form's native domain) — no nulls, no
// numbers, no unions. RHF's type is never inferred from Zod; the schema
// below is only applied explicitly, on submit (see toCompanyProfileInput).
export type CompanyProfileFormValues = {
  name: string;
  websiteUrl: string;
  linkedinUrl: string;
  oneLiner: string;
  description: string;
  hqCountry: string;
  hqState: string;
  hqCity: string;
  hqStreet: string;
  hqPostalCode: string;
  foundedYear: string;
};

export const EMPTY_COMPANY_PROFILE_FORM_VALUES: CompanyProfileFormValues = {
  name: "",
  websiteUrl: "",
  linkedinUrl: "",
  oneLiner: "",
  description: "",
  hqCountry: "",
  hqState: "",
  hqCity: "",
  hqStreet: "",
  hqPostalCode: "",
  foundedYear: "",
};

// 2. API input schema: the PUT request body contract. Every key is
// REQUIRED (no .optional()) so a PUT is always a full replace; values may
// be `null` for "intentionally empty," never *absent*. This is the only
// schema parseJsonBody validates against — and it must not trust the
// client to have already turned "" into null: a PUT sent directly (curl,
// a future client, a bug in some other caller) could still send ""/"   ",
// and z.string().nullable() alone would happily accept that and let blank
// strings reach the database. Every nullable text field uses a shared
// trimmed-and-non-empty helper so the *server* enforces "empty means
// null," not just this form.
const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).nullable();

// Plain z.url() is intentionally permissive — it accepts any
// WHATWG-parseable URL, including non-web schemes like `mailto:` or
// `file:`. These two fields are always meant to be links to a live
// website, so restrict to http/https specifically via z.httpUrl(), which
// also checks the hostname against a real domain regex (rejects bare
// hosts like `http://localhost`, which is fine here since a company's
// public website/LinkedIn URL should always have a real domain).
const nullableHttpUrl = z.httpUrl().nullable();

export const companyProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    websiteUrl: nullableHttpUrl,
    // Requiring a linkedin.com host specifically can be a follow-up
    // refinement, not this round's blocker.
    linkedinUrl: nullableHttpUrl,
    oneLiner: nullableTrimmedString(300),
    description: nullableTrimmedString(5000),
    hqCountry: nullableTrimmedString(100),
    hqState: nullableTrimmedString(100),
    hqCity: nullableTrimmedString(100),
    hqStreet: nullableTrimmedString(200),
    hqPostalCode: nullableTrimmedString(20),
    foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).nullable(),
  })
  .strict();
export type CompanyProfileInput = z.infer<typeof companyProfileInputSchema>;

// 3. The one explicit conversion, called manually inside onSubmit right
// before save() sends the request — this is where "" -> null and string
// -> number happen, nowhere else. Throws a ZodError via .parse() if the
// form produced something invalid (bad URL, blank required name,
// out-of-range year); onSubmit maps that error onto individual fields
// with form.setError. A bare "" or "   " for any nullable field is
// handled here (converted to null) before it ever reaches
// companyProfileInputSchema, so the common "user left a field blank"
// case parses successfully instead of failing the server's own
// non-blank check.
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toCompanyProfileInput(
  values: CompanyProfileFormValues,
): CompanyProfileInput {
  return companyProfileInputSchema.parse({
    name: values.name.trim(),
    websiteUrl: emptyToNull(values.websiteUrl),
    linkedinUrl: emptyToNull(values.linkedinUrl),
    oneLiner: emptyToNull(values.oneLiner),
    description: emptyToNull(values.description),
    hqCountry: emptyToNull(values.hqCountry),
    hqState: emptyToNull(values.hqState),
    hqCity: emptyToNull(values.hqCity),
    hqStreet: emptyToNull(values.hqStreet),
    hqPostalCode: emptyToNull(values.hqPostalCode),
    foundedYear: values.foundedYear.trim() === "" ? null : Number(values.foundedYear),
  });
}

// Response schema: hand-written, NOT companyProfileInputSchema.extend(...)
// — every field the repository maps must always be present in a GET/PUT
// response, with `null` (never missing) for empty ones, plus the
// generated/server-only fields the input schema must never accept.
export const companyProfileResponseSchema = z.object({
  name: z.string(),
  websiteUrl: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  oneLiner: z.string().nullable(),
  description: z.string().nullable(),
  hqCountry: z.string().nullable(),
  hqState: z.string().nullable(),
  hqCity: z.string().nullable(),
  hqStreet: z.string().nullable(),
  hqPostalCode: z.string().nullable(),
  foundedYear: z.number().int().nullable(),
  hqAddressFull: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CompanyProfile = z.infer<typeof companyProfileResponseSchema>;

// The inverse of toCompanyProfileInput, used by form.reset() after a
// GET/save response, or to seed an empty form when there is no profile.
export function toCompanyProfileFormValues(
  profile: CompanyProfile | null,
): CompanyProfileFormValues {
  if (!profile) {
    return EMPTY_COMPANY_PROFILE_FORM_VALUES;
  }
  return {
    name: profile.name,
    websiteUrl: profile.websiteUrl ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    oneLiner: profile.oneLiner ?? "",
    description: profile.description ?? "",
    hqCountry: profile.hqCountry ?? "",
    hqState: profile.hqState ?? "",
    hqCity: profile.hqCity ?? "",
    hqStreet: profile.hqStreet ?? "",
    hqPostalCode: profile.hqPostalCode ?? "",
    foundedYear: profile.foundedYear === null ? "" : String(profile.foundedYear),
  };
}
