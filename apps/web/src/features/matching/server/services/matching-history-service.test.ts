import assert from "node:assert/strict";
import { test } from "node:test";

import type { CurrentUser } from "@/features/auth/server/session";
import { MatchingHistoryService } from "@/features/matching/server/services/matching-history-service";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  type IntakeRequest,
} from "@/features/matching/types/match";
import { ApiError } from "@/lib/api/errors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sampleResponse = {
  status: "matched",
  parsed_company_profile: {},
  missing_fields: [],
  follow_up_question: null,
  follow_up_count: 0,
  matches: [],
};

test("all roles use persisted settings, ignoring forged or historical browser scores", async () => {
  const previousKey = process.env.RALLY_MATCHING_API_SECRET;
  process.env.RALLY_MATCHING_API_SECRET = "server-only-test-key";
  try {
    for (const role of ["founder", "reviewer", "admin"] as const) {
      const user: CurrentUser = {
        id: role,
        role,
        name: role,
        email: `${role}@example.com`,
      };
      const published = structuredClone(DEFAULT_MATCHING_CONFIGURATION);
      published.weights.sector_fit = 30;
      published.weights.theme_fit = 10;
      const snapshots: IntakeRequest[] = [];
      const service = new MatchingHistoryService({
        settings: {
          getForUser: async (sessionUser) => {
            assert.equal(sessionUser.id, user.id);
            return {
              configuration: published,
              globalConfiguration: published,
              source: "global",
              globalRevision: 2,
              personalRevision: null,
            };
          },
        },
        fetch: async (_url, init) => {
          const headers = new Headers(init?.headers);
          assert.equal(headers.get("X-Rally-Matching-Key"), "server-only-test-key");
          assert.match(String(headers.get("X-Request-ID") ?? ""), UUID_PATTERN);
          const body = JSON.parse(String(init?.body));
          assert.deepEqual(body.matching_configuration.weights, published.weights);
          assert.equal(
            body.matching_configuration.result_limit,
            role === "founder" ? 20 : 30,
          );
          assert.equal(
            body.matching_configuration.hard_filters.stage,
            role === "founder",
          );
          assert.deepEqual(
            body.matching_configuration.excluded_investor_types,
            role === "founder" ? [] : ["angel"],
          );
          return Response.json({ data: sampleResponse });
        },
        insertRun: async ({ request, userId }) => {
          assert.equal(userId, user.id);
          snapshots.push(structuredClone(request));
          return null;
        },
      });
      const forgedRequest = {
        message: "Sample company",
        matching_configuration: structuredClone(DEFAULT_MATCHING_CONFIGURATION),
      };
      forgedRequest.matching_configuration.result_limit = 30;
      forgedRequest.matching_configuration.hard_filters.stage = false;
      forgedRequest.matching_configuration.excluded_investor_types = ["angel"];
      await service.runIntake(forgedRequest, user);
      assert.equal(snapshots[0].matching_configuration?.weights.sector_fit, 30);
      // A subsequent publish affects the next match, not the stored first snapshot.
      published.weights.sector_fit = 35;
      published.weights.theme_fit = 5;
      await service.runIntake(forgedRequest, user);
      assert.equal(snapshots[0].matching_configuration?.weights.sector_fit, 30);
      assert.equal(snapshots[1].matching_configuration?.weights.sector_fit, 35);
      assert.equal(forgedRequest.matching_configuration.weights.sector_fit, 20);
    }
  } finally {
    if (previousKey === undefined) delete process.env.RALLY_MATCHING_API_SECRET;
    else process.env.RALLY_MATCHING_API_SECRET = previousKey;
  }
});

test("missing server key fails closed before accessing matching or database", async () => {
  const previousKey = process.env.RALLY_MATCHING_API_SECRET;
  delete process.env.RALLY_MATCHING_API_SECRET;
  try {
    await assert.rejects(
      new MatchingHistoryService().runIntake(
        { message: "Sample" },
        {
          id: "founder",
          role: "founder",
          email: "founder@example.com",
          name: "Founder",
        },
      ),
      (error: unknown) => error instanceof ApiError && error.status === 503,
    );
  } finally {
    if (previousKey === undefined) delete process.env.RALLY_MATCHING_API_SECRET;
    else process.env.RALLY_MATCHING_API_SECRET = previousKey;
  }
});

test("upstream matching failure persists a failed run and keeps request id", async () => {
  const previousKey = process.env.RALLY_MATCHING_API_SECRET;
  process.env.RALLY_MATCHING_API_SECRET = "server-only-test-key";
  try {
    const failed: Array<{
      requestId: string;
      errorMessage: string;
      upstreamStatus: number | null;
    }> = [];
    const service = new MatchingHistoryService({
      settings: {
        getForUser: async () => ({
          configuration: DEFAULT_MATCHING_CONFIGURATION,
          globalConfiguration: DEFAULT_MATCHING_CONFIGURATION,
          source: "global",
          globalRevision: 1,
          personalRevision: null,
        }),
      },
      fetch: async (_url, init) => {
        const headers = new Headers(init?.headers);
        assert.match(String(headers.get("X-Request-ID") ?? ""), UUID_PATTERN);
        return Response.json(
          {
            error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
          },
          {
            status: 500,
            headers: { "X-Request-ID": headers.get("X-Request-ID") ?? "" },
          },
        );
      },
      insertFailedRun: async (input) => {
        failed.push({
          requestId: input.requestId,
          errorMessage: input.errorMessage,
          upstreamStatus: input.upstreamStatus,
        });
      },
    });

    await assert.rejects(
      service.runIntake(
        { message: "Sample company" },
        {
          id: "founder",
          role: "founder",
          email: "founder@example.com",
          name: "Founder",
        },
      ),
      (error: unknown) =>
        error instanceof ApiError &&
        error.code === "MATCHING_API_FAILED" &&
        error.status === 500 &&
        typeof error.requestId === "string" &&
        UUID_PATTERN.test(error.requestId),
    );

    assert.equal(failed.length, 1);
    assert.match(failed[0].requestId, UUID_PATTERN);
    assert.equal(failed[0].upstreamStatus, 500);
    assert.match(failed[0].errorMessage, /INTERNAL_SERVER_ERROR/);
  } finally {
    if (previousKey === undefined) delete process.env.RALLY_MATCHING_API_SECRET;
    else process.env.RALLY_MATCHING_API_SECRET = previousKey;
  }
});

const validMatch = {
  investor_id: "airtree",
  investor_name: "AirTree",
  score: 82,
};

function serviceReturning(
  data: unknown,
  captured: { response?: unknown } = {},
): MatchingHistoryService {
  return new MatchingHistoryService({
    settings: {
      getForUser: async () => ({
        configuration: DEFAULT_MATCHING_CONFIGURATION,
        globalConfiguration: DEFAULT_MATCHING_CONFIGURATION,
        source: "global",
        globalRevision: 1,
        personalRevision: null,
      }),
    },
    fetch: async () => Response.json({ data }),
    insertRun: async (input) => {
      captured.response = input.response;
      return {
        id: "00000000-0000-4000-8000-000000000001",
        createdAt: new Date(0).toISOString(),
        response: input.response,
        matchingConfiguration: DEFAULT_MATCHING_CONFIGURATION,
        structuredIntake: null as never,
      };
    },
    insertFailedRun: async () => {},
  });
}

const founder: CurrentUser = {
  id: "founder",
  role: "founder",
  email: "founder@example.com",
  name: "Founder",
};

test("one malformed match never discards the rest of a successful run", async () => {
  const previousKey = process.env.RALLY_MATCHING_API_SECRET;
  process.env.RALLY_MATCHING_API_SECRET = "server-only-test-key";
  try {
    // capacity_estimate/evidence shapes drift between the Python scorer and
    // the Zod schema; that used to throw a ZodError on the whole response and
    // reach the founder as a bare 500, losing matches the API had computed.
    const service = serviceReturning({
      ...sampleResponse,
      matches: [
        validMatch,
        // Only an optional sub-object is malformed: the ranked result itself
        // is fine, so it must survive with that sub-object stripped.
        { ...validMatch, investor_id: "blackbird", capacity_estimate: {} },
        // Core field is wrong — nothing usable left, so this one is dropped.
        { ...validMatch, investor_id: "square-peg", investor_name: 12345 },
      ],
    });

    const result = await service.runIntake({ message: "Sample company" }, founder);

    assert.deepEqual(
      result.response.matches.map((match) => match.investor_id),
      ["airtree", "blackbird"],
    );
    assert.equal(result.response.matches[1].capacity_estimate, undefined);
    assert.equal(result.response.status, "matched");
  } finally {
    if (previousKey === undefined) delete process.env.RALLY_MATCHING_API_SECRET;
    else process.env.RALLY_MATCHING_API_SECRET = previousKey;
  }
});

test("an unusable response body fails as a named error, not a raw crash", async () => {
  const previousKey = process.env.RALLY_MATCHING_API_SECRET;
  process.env.RALLY_MATCHING_API_SECRET = "server-only-test-key";
  try {
    const service = serviceReturning({ status: "not-a-real-status" });

    await assert.rejects(
      service.runIntake({ message: "Sample company" }, founder),
      (error: unknown) =>
        error instanceof ApiError &&
        error.code === "MATCHING_RESPONSE_INVALID" &&
        error.status === 502,
    );
  } finally {
    if (previousKey === undefined) delete process.env.RALLY_MATCHING_API_SECRET;
    else process.env.RALLY_MATCHING_API_SECRET = previousKey;
  }
});

test("dropping every match is an error, never a silent zero-match result", async () => {
  const previousKey = process.env.RALLY_MATCHING_API_SECRET;
  process.env.RALLY_MATCHING_API_SECRET = "server-only-test-key";
  try {
    // "No investors matched" and "we could not read the matches we got" look
    // identical to the founder but mean opposite things — never conflate them.
    const service = serviceReturning({
      ...sampleResponse,
      matches: [{ investor_id: "airtree" }, { investor_name: "Blackbird" }],
    });

    await assert.rejects(
      service.runIntake({ message: "Sample company" }, founder),
      (error: unknown) =>
        error instanceof ApiError && error.code === "MATCHING_RESPONSE_INVALID",
    );
  } finally {
    if (previousKey === undefined) delete process.env.RALLY_MATCHING_API_SECRET;
    else process.env.RALLY_MATCHING_API_SECRET = previousKey;
  }
});

test("a genuinely empty match list still succeeds", async () => {
  const previousKey = process.env.RALLY_MATCHING_API_SECRET;
  process.env.RALLY_MATCHING_API_SECRET = "server-only-test-key";
  try {
    const service = serviceReturning({ ...sampleResponse, matches: [] });

    const result = await service.runIntake({ message: "Sample company" }, founder);

    assert.equal(result.response.matches.length, 0);
    assert.equal(result.response.status, "matched");
  } finally {
    if (previousKey === undefined) delete process.env.RALLY_MATCHING_API_SECRET;
    else process.env.RALLY_MATCHING_API_SECRET = previousKey;
  }
});
