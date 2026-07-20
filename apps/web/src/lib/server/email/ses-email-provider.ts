import "server-only";

import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

import type {
  EmailProvider,
  InvitationEmailInput,
} from "@/lib/server/email/email-provider";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatRole(role: string): string {
  return role.replaceAll("_", " ");
}

export class SesEmailProvider implements EmailProvider {
  private readonly client: SESv2Client;
  private readonly fromEmail: string;
  private readonly replyToEmail: string | undefined;

  constructor() {
    this.client = new SESv2Client({
      region:
        process.env.AWS_REGION ??
        process.env.AWS_DEFAULT_REGION ??
        "ap-southeast-2",
    });
    this.fromEmail = requiredEnv("SES_FROM_EMAIL");
    this.replyToEmail = process.env.SES_REPLY_TO_EMAIL;
  }

  async sendInvitation(input: InvitationEmailInput): Promise<void> {
    const role = formatRole(input.role);
    const subject = "You're invited to Rally";
    const text = [
      `${input.invitedByName} invited you to Rally as a ${role}.`,
      "",
      "Open this link to set your password and finish creating your account:",
      input.acceptUrl,
      "",
      `This invitation expires at ${input.expiresAt.toISOString()}.`,
    ].join("\n");
    const html = `
      <div style="font-family: Arial, sans-serif; color: #12352b; line-height: 1.5;">
        <h1 style="font-size: 20px; margin: 0 0 12px;">You're invited to Rally</h1>
        <p>${escapeHtml(input.invitedByName)} invited you to Rally as a ${escapeHtml(role)}.</p>
        <p>
          <a href="${escapeHtml(input.acceptUrl)}"
             style="display: inline-block; background: #d8ff2f; color: #092f25; padding: 10px 14px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Accept invitation
          </a>
        </p>
        <p style="font-size: 13px; color: #60736b;">
          This invitation expires at ${escapeHtml(input.expiresAt.toISOString())}.
        </p>
        <p style="font-size: 12px; color: #60736b;">
          If the button does not work, copy and paste this link into your browser:<br />
          ${escapeHtml(input.acceptUrl)}
        </p>
      </div>
    `;

    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.fromEmail,
        Destination: {
          ToAddresses: [input.to],
        },
        ReplyToAddresses: this.replyToEmail ? [this.replyToEmail] : undefined,
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: text, Charset: "UTF-8" },
              Html: { Data: html, Charset: "UTF-8" },
            },
          },
        },
      }),
    );
  }
}
