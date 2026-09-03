import "server-only";

import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

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
  type EmailContent,
} from "@/lib/server/email/email-templates";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export class SesEmailProvider implements EmailProvider {
  private readonly client: SESv2Client;
  private readonly fromEmail: string;
  private readonly replyToEmail: string | undefined;

  constructor() {
    this.client = new SESv2Client({
      region:
        process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-southeast-2",
    });
    this.fromEmail = requiredEnv("SES_FROM_EMAIL");
    this.replyToEmail = process.env.SES_REPLY_TO_EMAIL;
  }

  async sendInvitation(input: InvitationEmailInput): Promise<void> {
    await this.send(
      input.to,
      buildInvitationEmail(input, { replyToEmail: this.replyToEmail }),
    );
  }

  async sendWelcome(input: WelcomeEmailInput): Promise<void> {
    await this.send(
      input.to,
      buildWelcomeEmail(input, { replyToEmail: this.replyToEmail }),
    );
  }

  async sendVerification(input: VerificationEmailInput): Promise<void> {
    await this.send(
      input.to,
      buildVerificationEmail(input, { replyToEmail: this.replyToEmail }),
    );
  }

  private async send(to: string, content: EmailContent): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        ReplyToAddresses: this.replyToEmail ? [this.replyToEmail] : undefined,
        Content: {
          Simple: {
            Subject: { Data: content.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: content.text, Charset: "UTF-8" },
              Html: { Data: content.html, Charset: "UTF-8" },
            },
          },
        },
      }),
    );
  }
}
