import "server-only";

import type {
  EmailProvider,
  InvitationEmailInput,
  VerificationEmailInput,
  WelcomeEmailInput,
} from "@/lib/server/email/email-provider";
import {
  buildInvitationEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
} from "@/lib/server/email/email-templates";

/**
 * Local-development-only provider. Deliberately uses plain console.log
 * because printing the invite link is the point here. The provider
 * selector refuses to use this in production.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async sendInvitation(input: InvitationEmailInput): Promise<void> {
    const content = buildInvitationEmail(input, {
      replyToEmail: process.env.SES_REPLY_TO_EMAIL,
    });
    console.log(
      [
        "----- invitation email (console provider) -----",
        `to: ${input.to}`,
        `subject: ${content.subject}`,
        "",
        content.text,
        "------------------------------------------------",
      ].join("\n"),
    );
  }

  async sendWelcome(input: WelcomeEmailInput): Promise<void> {
    const content = buildWelcomeEmail(input, {
      replyToEmail: process.env.SES_REPLY_TO_EMAIL,
    });
    console.log(
      [
        "----- welcome email (console provider) -----",
        `to: ${input.to}`,
        `subject: ${content.subject}`,
        "",
        content.text,
        "------------------------------------------",
      ].join("\n"),
    );
  }

  async sendVerification(input: VerificationEmailInput): Promise<void> {
    const content = buildVerificationEmail(input, {
      replyToEmail: process.env.SES_REPLY_TO_EMAIL,
    });
    console.log(
      [
        "----- verification email (console provider) -----",
        `to: ${input.to}`,
        `subject: ${content.subject}`,
        "",
        content.text,
        "---------------------------------------------------",
      ].join("\n"),
    );
  }
}
