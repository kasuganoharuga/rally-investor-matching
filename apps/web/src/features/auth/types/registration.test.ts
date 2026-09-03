import assert from "node:assert/strict";
import { test } from "node:test";

import { registrationInputSchema } from "./registration";

const valid = {
  firstName: "Test",
  lastName: "Founder",
  email: "founder@example.test",
  password: "NotARealPassword123!",
  organisation: "Example company",
  linkedinUrl: "https://www.linkedin.com/in/example-founder",
};

test("accepts complete founder details and normalises email", () => {
  const result = registrationInputSchema.parse({
    ...valid,
    email: "FOUNDER@example.test",
  });
  assert.equal(result.email, "founder@example.test");
});

test("public registration cannot choose an account role or other privileged fields", () => {
  for (const field of ["role", "userId", "emailVerified"]) {
    assert.equal(
      registrationInputSchema.safeParse({ ...valid, [field]: "admin" }).success,
      false,
    );
  }
});

test("rejects missing lead details, short passwords and honeypots", () => {
  for (const change of [
    { organisation: "" },
    { firstName: " " },
    { password: "short" },
    { website: "spam" },
  ]) {
    assert.equal(
      registrationInputSchema.safeParse({ ...valid, ...change }).success,
      false,
    );
  }
});

test("LinkedIn profile is an HTTPS personal profile on the real host", () => {
  for (const linkedinUrl of [
    "javascript:alert(1)",
    "https://linkedin.com.evil.test/in/person",
    "http://linkedin.com/in/person",
    "https://www.linkedin.com/company/example",
    "https://user:password@linkedin.com/in/person",
  ]) {
    assert.equal(
      registrationInputSchema.safeParse({ ...valid, linkedinUrl }).success,
      false,
    );
  }
});
