import "server-only";

import type {
  EmailProvider,
  InvitationEmailInput,
} from "@/lib/server/email/email-provider";

/**
 * Local-development-only provider. Deliberately uses plain console.log
 * because printing the invite link is the point here. The provider
 * selector refuses to use this in production.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendInvitation(input: InvitationEmailInput): Promise<void> {
    console.log(
      [
        "----- invitation email (console provider) -----",
        `to: ${input.to}`,
        `role: ${input.role}`,
        `invited by: ${input.invitedByName}`,
        `expires at: ${input.expiresAt.toISOString()}`,
        `accept link: ${input.acceptUrl}`,
        "------------------------------------------------",
      ].join("\n"),
    );
  }
}
