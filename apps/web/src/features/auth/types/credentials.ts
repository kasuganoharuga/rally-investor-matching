import { z } from "zod";

/**
 * Client-side shape for the sign-in form. Kept separate from
 * `types/auth.ts` (which only describes the `role` enum) so form-input
 * validation and domain enums can evolve independently.
 */
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
