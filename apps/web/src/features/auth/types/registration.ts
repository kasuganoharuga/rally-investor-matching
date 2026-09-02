import { z } from "zod";

export const REGISTRATION_STAGE_OPTIONS = [
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c_plus", label: "Series C or later" },
  { value: "unknown", label: "Not raising yet / unsure" },
] as const;

export const registrationInputSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name.").max(100),
    lastName: z.string().trim().min(1, "Enter your last name.").max(100),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z.string().min(8, "Use at least 8 characters.").max(128),
    roleAtCompany: z.string().trim().min(1, "Enter your role at the company.").max(100),
    organisation: z
      .string()
      .trim()
      .min(1, "Enter your company or organisation.")
      .max(200),
    fundingStage: z.enum([
      "pre_seed",
      "seed",
      "series_a",
      "series_b",
      "series_c_plus",
      "unknown",
    ]),
    linkedinUrl: z
      .httpUrl()
      .max(500)
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          ["linkedin.com", "www.linkedin.com"].includes(url.hostname) &&
          url.pathname.startsWith("/in/") &&
          url.pathname.length > 4 &&
          !url.username &&
          !url.password
        );
      }, "Use your LinkedIn profile URL (https://www.linkedin.com/in/...)."),
    website: z.literal("").optional(),
  })
  .strict();

export type RegistrationInput = z.infer<typeof registrationInputSchema>;
