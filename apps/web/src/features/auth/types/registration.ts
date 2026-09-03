import { z } from "zod";

export const registrationInputSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name.").max(100),
    lastName: z.string().trim().min(1, "Enter your last name.").max(100),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z.string().min(8, "Use at least 8 characters.").max(128),
    organisation: z
      .string()
      .trim()
      .min(1, "Enter your company or organisation.")
      .max(200),
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
