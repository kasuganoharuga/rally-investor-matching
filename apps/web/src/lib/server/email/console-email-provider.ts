import "server-only";

import type {
  EmailProvider,
  InvitationEmailInput,
} from "@/lib/server/email/email-provider";

/**
 * Local-development-only provider. Deliberately uses plain
 * console.log (not lib/server/logger, which is a PII-free whitelist
 * logger) because printing the temporary password is the entire point
 * here — this is an intentional, explicit exception to "logs never
 * carry PII", not an oversight. getEmailProvider() refuses to select
 * this provider in production.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendInvitation(input: InvitationEmailInput): Promise<void> {
    console.log(
      [
        "----- invitation email (console provider) -----",
        `to: ${input.to}`,
        `role: ${input.role}`,
        `invited by: ${input.invitedByName}`,
        `temporary password: ${input.temporaryPassword}`,
        "------------------------------------------------",
      ].join("\n"),
    );
  }
}
