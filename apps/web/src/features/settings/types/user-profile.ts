import { z } from "zod";

// Mirrors features/company-profile/types/company-profile.ts's three-layer
// split: plain-string form values, a strict nullable-per-field API input
// schema, and a hand-written response schema. See that file for the full
// rationale of each layer.
export type UserProfileFormValues = {
  firstName: string;
  lastName: string;
  linkedinUrl: string;
  phone: string;
  roleAtCompany: string;
  bio: string;
  country: string;
  state: string;
  city: string;
};

export const EMPTY_USER_PROFILE_FORM_VALUES: UserProfileFormValues = {
  firstName: "",
  lastName: "",
  linkedinUrl: "",
  phone: "",
  roleAtCompany: "",
  bio: "",
  country: "",
  state: "",
  city: "",
};

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).nullable();
const nullableHttpUrl = z.httpUrl().nullable();

// Every field here is optional in the product sense (unlike
// company_profiles.name, user_profiles has no NOT NULL business column),
// but still required-but-nullable in the request shape: a PUT is always a
// full replace.
export const userProfileInputSchema = z
  .object({
    firstName: nullableTrimmedString(100),
    lastName: nullableTrimmedString(100),
    linkedinUrl: nullableHttpUrl,
    phone: nullableTrimmedString(30),
    roleAtCompany: nullableTrimmedString(100),
    bio: nullableTrimmedString(2000),
    country: nullableTrimmedString(100),
    state: nullableTrimmedString(100),
    city: nullableTrimmedString(100),
  })
  .strict();
export type UserProfileInput = z.infer<typeof userProfileInputSchema>;

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toUserProfileInput(values: UserProfileFormValues): UserProfileInput {
  return userProfileInputSchema.parse({
    firstName: emptyToNull(values.firstName),
    lastName: emptyToNull(values.lastName),
    linkedinUrl: emptyToNull(values.linkedinUrl),
    phone: emptyToNull(values.phone),
    roleAtCompany: emptyToNull(values.roleAtCompany),
    bio: emptyToNull(values.bio),
    country: emptyToNull(values.country),
    state: emptyToNull(values.state),
    city: emptyToNull(values.city),
  });
}

export const onboardingStatusSchema = z.enum([
  "new",
  "profile_done",
  "company_done",
  "complete",
]);
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

// Hand-written, NOT userProfileInputSchema.extend(...): fullName and
// onboardingStatus are generated/server-managed columns a PUT must never
// accept, but a GET/PUT response always includes them.
export const userProfileResponseSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string(),
  linkedinUrl: z.string().nullable(),
  phone: z.string().nullable(),
  roleAtCompany: z.string().nullable(),
  bio: z.string().nullable(),
  country: z.string().nullable(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  onboardingStatus: onboardingStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserProfile = z.infer<typeof userProfileResponseSchema>;

export function toUserProfileFormValues(
  profile: UserProfile | null,
): UserProfileFormValues {
  if (!profile) {
    return EMPTY_USER_PROFILE_FORM_VALUES;
  }
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    phone: profile.phone ?? "",
    roleAtCompany: profile.roleAtCompany ?? "",
    bio: profile.bio ?? "",
    country: profile.country ?? "",
    state: profile.state ?? "",
    city: profile.city ?? "",
  };
}
