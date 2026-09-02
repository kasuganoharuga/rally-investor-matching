import "server-only";

import {
  cleanupFreshProvisionedUser,
  provisionUser,
} from "@/features/auth/server/provision-user";
import type { RegistrationInput } from "@/features/auth/types/registration";
import { withTransaction } from "@/lib/server/db";
import { getEmailProvider } from "@/lib/server/email/get-email-provider";
import { logger } from "@/lib/server/logger";

export async function registerFounder(input: RegistrationInput) {
  const name = `${input.firstName} ${input.lastName}`;
  // Account role is deliberately not part of the public input contract.
  const user = await provisionUser({
    email: input.email,
    password: input.password,
    name,
    role: "founder",
  });
  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, role_at_company, linkedin_url, onboarding_status)
         VALUES ($1, $2, $3, $4, $5, 'profile_done')`,
        [
          user.userId,
          input.firstName,
          input.lastName,
          input.roleAtCompany,
          input.linkedinUrl,
        ],
      );
      const company = await client.query<{ id: string }>(
        "INSERT INTO company_profiles (owner_user_id, name) VALUES ($1, $2) RETURNING id",
        [user.userId, input.organisation],
      );
      await client.query(
        "INSERT INTO company_matching_profiles (company_profile_id, label, stage) VALUES ($1, 'Registration', $2)",
        [company.rows[0].id, input.fundingStage],
      );
    });
  } catch (error) {
    await cleanupFreshProvisionedUser({ userId: user.userId, email: user.email });
    throw error;
  }

  let welcomeEmailSent = false;
  try {
    const baseUrl = process.env.APP_BASE_URL ?? process.env.BETTER_AUTH_URL;
    if (!baseUrl) throw new Error("APP_BASE_URL is not configured");
    await getEmailProvider().sendWelcome({
      to: user.email,
      name,
      workspaceUrl: new URL("/match", baseUrl).toString(),
    });
    welcomeEmailSent = true;
  } catch {
    // Mail is supplementary; never delete a fully created account on SES failure.
    logger.error("registration_welcome_email_failed", { userId: user.userId });
  }
  return { email: user.email, welcomeEmailSent };
}
