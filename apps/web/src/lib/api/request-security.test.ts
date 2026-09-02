import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "@/lib/api/errors";
import { assertSameOriginJsonRequest } from "@/lib/api/request-security";

test("JSON writes require the configured origin and JSON content type", () => {
  const previousBaseUrl = process.env.APP_BASE_URL;
  process.env.APP_BASE_URL = "https://rally.example.com";
  try {
    const request = (origin: string | null, contentType = "application/json") => {
      const headers = new Headers({ "Content-Type": contentType });
      if (origin !== null) headers.set("Origin", origin);
      return new Request("http://internal:3000/api/matching/settings", {
        method: "PUT",
        headers,
        body: "{}",
      });
    };
    assert.doesNotThrow(() =>
      assertSameOriginJsonRequest(
        request("https://rally.example.com", "application/json; charset=utf-8"),
      ),
    );
    for (const invalid of [
      request(null),
      request("null"),
      request("https://evil.example.com"),
      request("http://internal:3000"),
      request("https://rally.example.com", "text/plain"),
    ]) {
      assert.throws(
        () => assertSameOriginJsonRequest(invalid),
        (error: unknown) => {
          return error instanceof ApiError && [403, 415].includes(error.status);
        },
      );
    }
  } finally {
    if (previousBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = previousBaseUrl;
  }
});
