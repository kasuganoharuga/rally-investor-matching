import assert from "node:assert/strict";
import { test } from "node:test";

import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

import { SesEmailProvider } from "./ses-email-provider";

test("SES sends the branded invitation and welcome with existing delivery configuration", async (context) => {
  const originalFrom = process.env.SES_FROM_EMAIL;
  const originalReplyTo = process.env.SES_REPLY_TO_EMAIL;
  const originalRegion = process.env.AWS_REGION;
  process.env.SES_FROM_EMAIL = "Rally <no-reply@rally.example>";
  process.env.SES_REPLY_TO_EMAIL = "support@rally.example";
  process.env.AWS_REGION = "ap-southeast-2";
  context.after(() => {
    for (const [key, value] of Object.entries({
      SES_FROM_EMAIL: originalFrom,
      SES_REPLY_TO_EMAIL: originalReplyTo,
      AWS_REGION: originalRegion,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const commands: SendEmailCommand[] = [];
  // Mock the client transport: the test cannot send mail or call AWS.
  context.mock.method(SESv2Client.prototype, "send", async (command: unknown) => {
    assert.ok(command instanceof SendEmailCommand);
    commands.push(command);
    return { MessageId: "test-message" };
  });

  const provider = new SesEmailProvider();
  await provider.sendInvitation({
    to: "reviewer@example.com",
    role: "reviewer",
    invitedByName: "Rally Team",
    acceptUrl: "https://rally.example/invite/test-token",
    expiresAt: new Date("2026-09-09T04:30:00Z"),
  });
  await provider.sendWelcome({
    to: "founder@example.com",
    name: "Alex",
    workspaceUrl: "https://rally.example/match",
  });

  assert.equal(commands.length, 2);
  assert.deepEqual(commands[0].input.Destination?.ToAddresses, [
    "reviewer@example.com",
  ]);
  assert.deepEqual(commands[1].input.Destination?.ToAddresses, ["founder@example.com"]);
  for (const command of commands) {
    assert.equal(command.input.FromEmailAddress, "Rally <no-reply@rally.example>");
    assert.deepEqual(command.input.ReplyToAddresses, ["support@rally.example"]);
    assert.equal(command.input.Content?.Simple?.Subject?.Charset, "UTF-8");
    assert.equal(command.input.Content?.Simple?.Body?.Text?.Charset, "UTF-8");
    assert.equal(command.input.Content?.Simple?.Body?.Html?.Charset, "UTF-8");
    assert.match(
      command.input.Content?.Simple?.Body?.Html?.Data ?? "",
      /<!doctype html>/,
    );
  }
  assert.match(
    commands[0].input.Content?.Simple?.Body?.Text?.Data ?? "",
    /apply only to you/,
  );
  assert.match(
    commands[1].input.Content?.Simple?.Body?.Text?.Data ?? "",
    /Open Workspace/,
  );
});
