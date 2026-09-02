import assert from "node:assert/strict";
import { test } from "node:test";

import { buildInvitationEmail, buildWelcomeEmail } from "./email-templates";

const invitation = {
  to: "founder@example.com",
  role: "founder",
  invitedByName: "Rally Team",
  acceptUrl: "https://rally.example/invite/test-token?source=email&campaign=invite",
  expiresAt: new Date("2026-09-09T04:30:00Z"),
};

const welcome = {
  to: "founder@example.com",
  name: "Alex",
  workspaceUrl: "https://rally.example/match",
};

test("invitation includes account CTA, Workspace next step and explicit local expiry", () => {
  const email = buildInvitationEmail(invitation);
  assert.match(email.subject, /Rally Investor Matching/);
  assert.match(email.html, /Create your account/);
  assert.match(email.text, /straight to Workspace/);
  assert.match(email.text, /9 September 2026/);
  assert.match(email.text, /GMT\+10:00.*Sydney time/);
  assert.match(email.text, /2:30 pm/i);
  assert.match(email.text, /Do not forward or share the link/);
  assert.match(email.text, /safely ignore/);
  assert.ok(email.text.includes(invitation.acceptUrl));
  assert.match(email.html, /source=email&amp;campaign=invite/);
  assert.match(email.html, /If the button does not work/);
});

test("invitation expiry adjusts for daylight saving", () => {
  const email = buildInvitationEmail({
    ...invitation,
    expiresAt: new Date("2026-12-09T04:30:00Z"),
  });
  assert.match(email.text, /GMT\+11:00.*Sydney time/);
  assert.match(email.text, /3:30 pm/i);
});

test("admin and reviewer descriptions clearly distinguish global and personal scoring", () => {
  const admin = buildInvitationEmail({ ...invitation, role: "admin" });
  const reviewer = buildInvitationEmail({ ...invitation, role: "reviewer" });
  const founder = buildInvitationEmail(invitation);
  assert.match(admin.text, /Step 4.*settings for everyone/);
  assert.match(reviewer.text, /Step 4.*your own matches/);
  assert.match(reviewer.text, /apply only to you/);
  assert.doesNotMatch(founder.text, /Step 4/);
  assert.doesNotMatch(founder.html, /Step 4/);
});

test("dynamic invitation and welcome content is HTML escaped", () => {
  const hostileName = "<img src=x onerror=\"alert(1)\"> & 'name'";
  const email = buildInvitationEmail({
    ...invitation,
    invitedByName: hostileName,
    role: '<script>alert("role")</script>',
  });
  const welcomeEmail = buildWelcomeEmail({ ...welcome, name: hostileName });
  for (const content of [email, welcomeEmail]) {
    assert.doesNotMatch(content.html, /<img|<script>/);
    assert.match(content.html, /&lt;img/);
    assert.match(content.html, /&quot;alert\(1\)&quot;/);
    assert.match(content.html, /&amp; &#39;name&#39;/);
    assert.ok(content.text.includes(hostileName));
  }
  assert.match(email.html, /&lt;script&gt;/);
});

test("action URLs reject non-web schemes, relative links and embedded credentials", () => {
  const unsafeUrls = [
    "javascript:alert(1)",
    "data:text/html,hello",
    "ftp://rally.example/test",
    "/match",
    "https://username:password@rally.example/match",
    "https://username@rally.example/match",
  ];
  for (const url of unsafeUrls) {
    assert.throws(() => buildInvitationEmail({ ...invitation, acceptUrl: url }));
    assert.throws(() => buildWelcomeEmail({ ...welcome, workspaceUrl: url }));
  }
});

test("local HTTP links remain usable in development", () => {
  const email = buildWelcomeEmail({
    ...welcome,
    workspaceUrl: "http://localhost:3000/match",
  });
  assert.match(email.html, /href="http:\/\/localhost:3000\/match"/);
});

test("configured Reply-To enables support by reply, otherwise no false reply promise", () => {
  for (const build of [
    (replyToEmail?: string) => buildInvitationEmail(invitation, { replyToEmail }),
    (replyToEmail?: string) => buildWelcomeEmail(welcome, { replyToEmail }),
  ]) {
    assert.match(build("support@rally.example").text, /Reply to this email/);
    assert.doesNotMatch(build().text, /Reply to this email/);
    assert.doesNotMatch(build(" ").text, /Reply to this email/);
  }
});

test("welcome gives founder next steps and login information without a verification gate", () => {
  const email = buildWelcomeEmail(welcome);
  assert.match(email.text, /Hi Alex/);
  assert.match(email.html, /Open Workspace/);
  assert.match(email.text, /1\. Tell us about your company/);
  assert.match(email.text, /download a CSV/);
  assert.match(email.text, /password you chose/);
  assert.match(email.text, /never ask you to send your password/);
  assert.doesNotMatch(email.text, /Step 4|verify your email/i);
  assert.ok(email.text.includes(welcome.workspaceUrl));
});

test("blank welcome name uses a friendly fallback", () => {
  assert.match(buildWelcomeEmail({ ...welcome, name: "  " }).text, /Hi there,/);
});

test("invalid expiry fails before a misleading invitation can be sent", () => {
  assert.throws(() =>
    buildInvitationEmail({ ...invitation, expiresAt: new Date("invalid") }),
  );
});
