import assert from "node:assert/strict";
import { test } from "node:test";

import type { CurrentUser } from "@/features/auth/server/session";
import { MatchingHistoryService } from "@/features/matching/server/services/matching-history-service";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  type IntakeRequest,
} from "@/features/matching/types/match";
import { ApiError } from "@/lib/api/errors";

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
