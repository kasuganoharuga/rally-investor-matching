import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_MATCHING_CONFIGURATION } from "@/features/matching/types/match";
import {
  resolveMatchingConfiguration,
  sameMatchingWeights,
} from "@/features/matching/types/matching-settings";

test("changing per-match options does not create an unsaved weights draft", () => {
  const current = structuredClone(DEFAULT_MATCHING_CONFIGURATION);
  current.result_limit = 30;
  current.hard_filters.geography = false;
  current.excluded_investor_types = ["angel"];
  assert.equal(sameMatchingWeights(current, DEFAULT_MATCHING_CONFIGURATION), true);
  current.weights.sector_fit = 30;
  current.weights.theme_fit = 10;
  assert.equal(sameMatchingWeights(current, DEFAULT_MATCHING_CONFIGURATION), false);
});

test("rematch uses current weights, preserves only staff per-match options, and never mutates history", () => {
  const current = structuredClone(DEFAULT_MATCHING_CONFIGURATION);
  current.weights.sector_fit = 30;
  current.weights.theme_fit = 10;
  const history = structuredClone(DEFAULT_MATCHING_CONFIGURATION);
  history.result_limit = 30;
  history.hard_filters.stage = false;
  const untouchedHistory = structuredClone(history);
  for (const role of ["founder", "reviewer", "admin"] as const) {
    const rematch = resolveMatchingConfiguration(role, current, history);
    assert.equal(rematch.weights.sector_fit, 30);
    assert.equal(rematch.result_limit, role === "founder" ? 20 : 30);
    assert.equal(rematch.hard_filters.stage, role === "founder");
  }
  assert.deepEqual(history, untouchedHistory);
});
