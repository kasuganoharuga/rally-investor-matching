import "server-only";

import type { InvitationEmailInput, WelcomeEmailInput } from "./email-provider";

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

type TemplateOptions = { replyToEmail?: string };

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Email action links must be absolute web URLs, never script or data URLs. */
function webUrl(value: string): string {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Email action URL must be an HTTP(S) URL without credentials");
  }
  return url.toString();
}

function invitationAccess(role: string): { label: string; description: string } {
  switch (role) {
    case "admin":
      return {
        label: "Administrator",
        description:
          "In Step 4, you can save scoring settings for everyone. Review your changes carefully before publishing them as the shared defaults.",
      };
    case "reviewer":
      return {
        label: "Reviewer",
        description:
          "In Step 4, you can adjust scoring for your own matches. Your saved settings apply only to you and do not change anyone else's scoring.",
      };
    case "founder":
      return {
        label: "Founder",
        description:
          "Use Workspace to tell us about your company and funding round, find relevant investors, and review your match results.",
      };
    default:
      return {
        label: role.replaceAll("_", " "),
        description:
          "Open Workspace to get started. The tools available to you depend on the access your inviter has assigned.",
      };
  }
}

function formatExpiry(expiresAt: Date): string {
  // Sydney is Rally's operating timezone. Including the offset makes DST explicit.
  return `${new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
    timeZoneName: "longOffset",
  }).format(expiresAt)} (Sydney time)`;
}

function supportText(options: TemplateOptions, fallback: string): string {
  return options.replyToEmail?.trim()
    ? "Need a hand? Reply to this email and our team will help."
    : fallback;
}

type LayoutInput = {
  preheader: string;
  heading: string;
  bodyHtml: string;
  actionLabel: string;
  actionUrl: string;
  afterActionHtml: string;
  security: string;
  support: string;
};

/** Table layout and inline styles also work in email clients without CSS support. */
function renderLayout(input: LayoutInput): string {
  const actionUrl = escapeHtml(input.actionUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fa;color:#073127;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f8fa;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;">
        <tr><td style="padding:24px 28px;background:#073127;border-radius:12px 12px 0 0;">
          <span style="color:#eaff5b;font-size:26px;font-weight:800;letter-spacing:2px;">RALLY</span>
          <div style="color:#ffffff;font-size:12px;letter-spacing:1px;">INVESTOR MATCHING</div>
        </td></tr>
        <tr><td style="padding:32px 28px;background:#ffffff;border:1px solid #d8e0dd;border-top:0;border-radius:0 0 12px 12px;">
          <h1 style="margin:0 0 18px;font-size:28px;line-height:1.25;color:#073127;">${escapeHtml(input.heading)}</h1>
          ${input.bodyHtml}
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;"><tr>
            <td bgcolor="#eaff5b" style="border-radius:8px;text-align:center;">
              <a href="${actionUrl}" style="display:inline-block;border:1px solid #eaff5b;border-radius:8px;padding:13px 22px;color:#073127;font-size:16px;font-weight:bold;text-decoration:none;mso-padding-alt:13px 22px;">${escapeHtml(input.actionLabel)}</a>
            </td>
          </tr></table>
          ${input.afterActionHtml}
          <p style="margin:24px 0 6px;font-size:12px;color:#54645f;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;overflow-wrap:anywhere;"><a href="${actionUrl}" style="color:#073127;text-decoration:underline;">${actionUrl}</a></p>
          <hr style="border:0;border-top:1px solid #d8e0dd;margin:28px 0 20px;" />
          <p style="margin:0 0 12px;font-size:13px;color:#54645f;">${escapeHtml(input.security)}</p>
          <p style="margin:0;font-size:13px;color:#54645f;">${escapeHtml(input.support)}</p>
        </td></tr>
        <tr><td align="center" style="padding:20px 16px;font-size:12px;color:#54645f;">Rally Investor Matching · Connect with the right investors.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildInvitationEmail(
  input: InvitationEmailInput,
  options: TemplateOptions = {},
): EmailContent {
  const actionUrl = webUrl(input.acceptUrl);
  const access = invitationAccess(input.role);
  const expiry = formatExpiry(input.expiresAt);
  const intro = `${input.invitedByName} has invited you to Rally with ${access.label.toLowerCase()} access.`;
  const purpose =
    "Rally helps you find investors aligned with your company, funding stage and growth plans.";
  const next =
    "Create your account and set a password. We'll take you straight to Workspace to get started.";
  const security =
    "This invitation is intended only for you. Do not forward or share the link. If you weren't expecting it, you can safely ignore this email.";
  const support = supportText(
    options,
    "Need a hand or a fresh invitation? Contact the person who invited you.",
  );
  return {
    subject: "You're invited to Rally Investor Matching",
    text: [
      "You're invited to Rally",
      "",
      intro,
      purpose,
      "",
      `Your access: ${access.label}`,
      access.description,
      "",
      next,
      "Create your account:",
      actionUrl,
      "",
      `Your invitation expires on ${expiry}.`,
      "If it has expired, ask your inviter to send a new invitation.",
      "",
      security,
      support,
      "",
      "Rally Investor Matching",
    ].join("\n"),
    html: renderLayout({
      preheader: `${input.invitedByName} invited you to Rally. Create your account and start in Workspace.`,
      heading: "You're invited to Rally",
      bodyHtml: `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
          <p style="margin:0 0 24px;color:#54645f;">${escapeHtml(purpose)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:18px 20px;background:#eef2f1;border-left:3px solid #073127;border-radius:4px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:bold;">Your access: ${escapeHtml(access.label)}</p>
            <p style="margin:0;font-size:14px;">${escapeHtml(access.description)}</p>
          </td></tr></table>
          <p style="margin:24px 0 0;">${escapeHtml(next)}</p>`,
      actionLabel: "Create your account",
      actionUrl,
      afterActionHtml: `<p style="margin:0 0 6px;font-size:13px;color:#54645f;">Your invitation expires on <strong>${escapeHtml(expiry)}</strong>.</p>
          <p style="margin:0;font-size:13px;color:#54645f;">If it has expired, ask your inviter to send a new invitation.</p>`,
      security,
      support,
    }),
  };
}

export function buildWelcomeEmail(
  input: WelcomeEmailInput,
  options: TemplateOptions = {},
): EmailContent {
  const actionUrl = webUrl(input.workspaceUrl);
  const greeting = input.name.trim() ? `Hi ${input.name.trim()},` : "Hi there,";
  const intro =
    "Your Rally account is ready. Let's find investors aligned with your company and funding plans.";
  const steps = [
    "Tell us about your company and the round you're raising.",
    "Add your market, sector and other matching preferences.",
    "Review your investor matches and download a CSV to plan your outreach.",
  ];
  const security =
    "If you did not create this account, do not sign in or share any information. We will never ask you to send your password by email.";
  const support = supportText(
    options,
    "Need a hand, or didn't create this account? Contact the Rally team through the person who introduced you to Rally.",
  );
  return {
    subject: "Welcome to Rally — your Workspace is ready",
    text: [
      "Welcome to Rally",
      "",
      greeting,
      intro,
      "",
      "Start in Workspace:",
      ...steps.map((step, index) => `${index + 1}. ${step}`),
      "",
      "Open Workspace:",
      actionUrl,
      "Use the email address and password you chose when signing up.",
      "",
      security,
      support,
      "",
      "Rally Investor Matching",
    ].join("\n"),
    html: renderLayout({
      preheader: "Your account is ready. Start your first investor match in Workspace.",
      heading: "Welcome to Rally",
      bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 24px;color:#54645f;">${escapeHtml(intro)}</p>
          <h2 style="margin:0 0 12px;font-size:17px;">Your first match starts here</h2>
          <ol style="margin:0;padding-left:22px;">${steps.map((step) => `<li style="padding:0 0 10px 4px;">${escapeHtml(step)}</li>`).join("")}</ol>`,
      actionLabel: "Open Workspace",
      actionUrl,
      afterActionHtml:
        '<p style="margin:0;font-size:13px;color:#54645f;">Use the email address and password you chose when signing up.</p>',
      security,
      support,
    }),
  };
}
