import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { NextRequest } from "next/server";

import {
  assertRegistrationOrigin,
  checkRegistrationRateLimit,
  registrationClientIp,
} from "./registration-security";
import { parseJsonBody } from "@/lib/api/request";
import type { Queryable } from "@/lib/server/db";
import { z } from "zod";

test("registration rejects missing and cross-site origins", () => {
  const previous = process.env.APP_BASE_URL;
  process.env.APP_BASE_URL = "https://rally.example.test";
  try {
    for (const origin of ["", "https://evil.example.test"]) {
      assert.throws(
        () =>
          assertRegistrationOrigin(
            new NextRequest("https://rally.example.test/api/registration", {
              method: "POST",
              headers: { origin, "content-type": "application/json" },
            }),
          ),
        { status: 403 },
      );
    }
    assert.doesNotThrow(() =>
      assertRegistrationOrigin(
        new NextRequest("https://rally.example.test/api/registration", {
          method: "POST",
          headers: {
            origin: "https://rally.example.test",
            "content-type": "application/json",
          },
        }),
      ),
    );
  } finally {
    if (previous === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previous;
  }
});

test("body limit applies even without Content-Length", async () => {
  const request = new NextRequest("https://rally.example.test/api/registration", {
    method: "POST",
    body: JSON.stringify({ text: "x".repeat(200) }),
  });
  await assert.rejects(parseJsonBody(request, z.object({ text: z.string() }), 100), {
    status: 413,
  });
});

test("bounded JSON parser still accepts valid data and rejects invalid JSON", async () => {
  const request = (body: string) =>
    new NextRequest("https://rally.example.test/api/registration", {
      method: "POST",
      body,
    });
  assert.deepEqual(
    await parseJsonBody(request('{"ok":true}'), z.object({ ok: z.boolean() }), 100),
    { ok: true },
  );
  await assert.rejects(parseJsonBody(request("{"), z.object({}), 100), { status: 400 });
});

const RATE_LIMIT_TEST_SECRET = "registration-rate-limit-test-only";

function memoryRateLimitClient() {
  const counts = new Map<string, number>();
  const client = {
    query: async (sql: string, values?: unknown[]) => {
      if (sql.startsWith("DELETE")) return { rows: [] };
      assert.match(sql, /WHERE registration_rate_limits\.attempts < \$2/);
      const key = String(values?.[0]);
      const limit = Number(values?.[1]);
      // Persisted parameters contain hashes/counters, not email or IP values.
      assert.match(key, /^[a-f0-9]{64}$/);
      const current = counts.get(key) ?? 0;
      if (current >= limit) return { rows: [] };
      counts.set(key, current + 1);
      return { rows: [{ attempts: current + 1 }] };
    },
  } as unknown as Queryable;
  return {
    client,
    bucketCount: () => counts.size,
    count: (identity: string) =>
      counts.get(
        createHmac("sha256", RATE_LIMIT_TEST_SECRET).update(identity).digest("hex"),
      ) ?? 0,
  };
}

function registrationRequest(ip: string) {
  return new NextRequest("https://rally.example.test/api/registration", {
    headers: { "x-real-ip": ip },
  });
}

async function withRateLimitEnvironment(
  trustProxy: string | undefined,
  run: () => Promise<void> | void,
) {
  const previousSecret = process.env.BETTER_AUTH_SECRET;
  const previousTrustProxy = process.env.TRUST_PROXY;
  process.env.BETTER_AUTH_SECRET = RATE_LIMIT_TEST_SECRET;
  if (trustProxy === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = trustProxy;
  try {
    await run();
  } finally {
    if (previousSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = previousSecret;
    if (previousTrustProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previousTrustProxy;
  }
}

test("blocked email attempts may consume caller IP attempts but never global capacity", async () => {
  await withRateLimitEnvironment("true", async () => {
    const { client, count } = memoryRateLimitClient();
    const request = registrationRequest("192.0.2.1");
    for (let attempt = 0; attempt < 3; attempt++) {
      await checkRegistrationRateLimit(request, "same@example.test", client);
    }
    for (let attempt = 0; attempt < 105; attempt++) {
      await assert.rejects(
        checkRegistrationRateLimit(request, "same@example.test", client),
        { status: 429 },
      );
    }
    assert.equal(count("email:same@example.test"), 3);
    assert.equal(count("ip:192.0.2.1"), 10);
    assert.equal(count("global"), 3);
    await checkRegistrationRateLimit(
      registrationRequest("192.0.2.2"),
      "new@example.test",
      client,
    );
    assert.equal(count("global"), 4);
  });
});

test("blocked IP attempts cannot allocate new email buckets or drain global capacity", async () => {
  await withRateLimitEnvironment("true", async () => {
    const { client, count, bucketCount } = memoryRateLimitClient();
    const request = registrationRequest("192.0.2.1");
    for (let attempt = 0; attempt < 10; attempt++) {
      await checkRegistrationRateLimit(
        request,
        `founder-${attempt}@example.test`,
        client,
      );
    }
    const admittedBucketCount = bucketCount();
    assert.equal(admittedBucketCount, 12); // 10 emails, one IP and one global bucket.
    for (let attempt = 10; attempt < 1_010; attempt++) {
      await assert.rejects(
        checkRegistrationRateLimit(request, `founder-${attempt}@example.test`, client),
        { status: 429 },
      );
    }
    assert.equal(count("ip:192.0.2.1"), 10);
    assert.equal(count("global"), 10);
    assert.equal(bucketCount(), admittedBucketCount);
    assert.equal(count("email:founder-1009@example.test"), 0);
  });
});

test("untrusted or invalid proxy settings cannot use spoofed X-Real-IP buckets", async () => {
  for (const flag of [undefined, "false", "TRUE", "1"]) {
    await withRateLimitEnvironment(flag, async () => {
      const { client, count } = memoryRateLimitClient();
      for (let attempt = 0; attempt < 10; attempt++) {
        await checkRegistrationRateLimit(
          registrationRequest(`192.0.2.${attempt + 1}`),
          `founder-${attempt}@example.test`,
          client,
        );
      }
      await assert.rejects(
        checkRegistrationRateLimit(
          registrationRequest("198.51.100.1"),
          "last@example.test",
          client,
        ),
        { status: 429 },
      );
      assert.equal(count("ip:unknown"), 10);
      assert.equal(count("global"), 10);
    });
  }
});

test("explicit trusted proxy accepts only IP literals and global capacity saturates", async () => {
  await withRateLimitEnvironment("true", async () => {
    assert.equal(
      registrationClientIp(registrationRequest("2001:db8::1")),
      "2001:db8::1",
    );
    for (const invalid of ["", "spoofed", "192.0.2.1, 192.0.2.2", "192.0.2.1:8080"]) {
      assert.equal(registrationClientIp(registrationRequest(invalid)), "unknown");
    }
    const { client, count } = memoryRateLimitClient();
    for (let attempt = 0; attempt < 100; attempt++) {
      await checkRegistrationRateLimit(
        registrationRequest(`192.0.2.${attempt + 1}`),
        `founder-${attempt}@example.test`,
        client,
      );
    }
    await assert.rejects(
      checkRegistrationRateLimit(
        registrationRequest("198.51.100.1"),
        "last@example.test",
        client,
      ),
      { status: 429 },
    );
    assert.equal(count("global"), 100);
  });
});
