import assert from "node:assert/strict";
import { test } from "node:test";

import type { CurrentUser } from "@/features/auth/server/session";
import {
  MatchingSettingsRepository,
  type StoredMatchingSettings,
} from "@/features/matching/server/repositories/matching-settings-repository";
import { MatchingSettingsService } from "@/features/matching/server/services/matching-settings-service";
import {
  DEFAULT_MATCHING_CONFIGURATION,
  type MatchingConfiguration,
} from "@/features/matching/types/match";
import { ApiError } from "@/lib/api/errors";

function user(role: CurrentUser["role"], id: string = role): CurrentUser {
  return { id, role, email: `${id}@example.com`, name: id };
}

function configuration(sectorWeight = 20): MatchingConfiguration {
  return {
    ...structuredClone(DEFAULT_MATCHING_CONFIGURATION),
    weights: {
      ...DEFAULT_MATCHING_CONFIGURATION.weights,
      sector_fit: sectorWeight,
      theme_fit: 40 - sectorWeight,
    },
  };
}

class MemorySettingsRepository extends MatchingSettingsRepository {
  global: StoredMatchingSettings = { configuration: configuration(), revision: 1 };
  personal = new Map<string, StoredMatchingSettings>();
  private nextPersonalRevision = 1;

  override async getGlobal() {
    return structuredClone(this.global);
  }

  override async getPersonal(userId: string) {
    return structuredClone(this.personal.get(userId) ?? null);
  }

  override async saveGlobal(
    _userId: string,
    config: MatchingConfiguration,
    expectedRevision: number,
  ) {
    if (this.global.revision !== expectedRevision) return false;
    this.global = { configuration: config, revision: expectedRevision + 1 };
    return true;
  }

  override async savePersonal(
    userId: string,
    config: MatchingConfiguration,
    expectedRevision: number,
  ) {
    if ((this.personal.get(userId)?.revision ?? 0) !== expectedRevision) return false;
    this.personal.set(userId, {
      configuration: config,
      revision: this.nextPersonalRevision++,
    });
    return true;
  }

  override async resetPersonal(userId: string, expectedRevision: number) {
    if (this.personal.get(userId)?.revision !== expectedRevision) return false;
    this.personal.delete(userId);
    return true;
  }
}

test("admin publishes durable global defaults for founders and other admins", async () => {
  const repository = new MemorySettingsRepository();
  const service = new MatchingSettingsService(repository);
  await service.save(user("admin"), {
    configuration: configuration(30),
    expectedRevision: 1,
  });
  const anotherSession = new MatchingSettingsService(repository);
  for (const role of ["founder", "admin", "reviewer"] as const) {
    const settings = await anotherSession.getForUser(user(role));
    assert.equal(settings.configuration.weights.sector_fit, 30);
    assert.equal(settings.source, "global");
    assert.equal(settings.globalRevision, 2);
  }
});

test("reviewer changes are owned by the session user and do not change global", async () => {
  const repository = new MemorySettingsRepository();
  const service = new MatchingSettingsService(repository);
  const reviewer = user("reviewer", "reviewer-a");
  await service.save(reviewer, {
    configuration: configuration(35),
    expectedRevision: 0,
  });
  assert.equal((await service.getForUser(reviewer)).source, "personal");
  assert.equal(
    (await service.getForUser(reviewer)).configuration.weights.sector_fit,
    35,
  );
  assert.equal(
    (await service.getForUser(user("reviewer", "reviewer-b"))).configuration.weights
      .sector_fit,
    20,
  );
  assert.equal(repository.global.configuration.weights.sector_fit, 20);
  await assert.rejects(
    service.save(reviewer, {
      configuration: configuration(30),
      expectedRevision: 1,
      scope: "global",
      userId: "reviewer-b",
    }),
  );
});

test("global updates preserve reviewer overrides; reset follows the latest global", async () => {
  const service = new MatchingSettingsService(new MemorySettingsRepository());
  const reviewer = user("reviewer");
  await service.save(reviewer, {
    configuration: configuration(35),
    expectedRevision: 0,
  });
  await service.save(user("admin"), {
    configuration: configuration(10),
    expectedRevision: 1,
  });
  assert.equal(
    (await service.getForUser(reviewer)).configuration.weights.sector_fit,
    35,
  );
  const reset = await service.resetPersonal(reviewer, { expectedRevision: 1 });
  assert.equal(reset.configuration.weights.sector_fit, 10);
  assert.equal(reset.source, "global");
  assert.equal(reset.personalRevision, null);
});

test("founders cannot save or reset and ignore a previous reviewer override", async () => {
  const service = new MatchingSettingsService(new MemorySettingsRepository());
  const formerReviewer = user("reviewer", "same-user");
  await service.save(formerReviewer, {
    configuration: configuration(35),
    expectedRevision: 0,
  });
  const founder = { ...formerReviewer, role: "founder" as const };
  for (const operation of [
    service.save(founder, { configuration: configuration(30), expectedRevision: 1 }),
    service.resetPersonal(founder, { expectedRevision: 1 }),
    service.resetPersonal(user("admin"), { expectedRevision: 1 }),
  ]) {
    await assert.rejects(operation, (error: unknown) => {
      return error instanceof ApiError && error.status === 403;
    });
  }
  assert.equal(
    (await service.getForUser(founder)).configuration.weights.sector_fit,
    20,
  );
});

test("weights must be whole points totalling 100 and result limits stay in range", async () => {
  const repository = new MemorySettingsRepository();
  const service = new MatchingSettingsService(repository);
  for (const invalid of [
    { ...configuration(), weights: { ...configuration().weights, sector_fit: 99 } },
    { ...configuration(), weights: { ...configuration().weights, sector_fit: -1 } },
    {
      ...configuration(),
      weights: { ...configuration().weights, sector_fit: 20.5, theme_fit: 19.5 },
    },
    { ...configuration(), result_limit: 31 },
  ]) {
    await assert.rejects(
      service.save(user("admin"), { configuration: invalid, expectedRevision: 1 }),
    );
  }
  assert.equal(repository.global.revision, 1);
});

test("stale global and personal saves/resets return conflict instead of overwriting", async () => {
  const service = new MatchingSettingsService(new MemorySettingsRepository());
  await service.save(user("admin"), {
    configuration: configuration(30),
    expectedRevision: 1,
  });
  await service.save(user("reviewer"), {
    configuration: configuration(35),
    expectedRevision: 0,
  });
  for (const operation of [
    service.save(user("admin"), {
      configuration: configuration(10),
      expectedRevision: 1,
    }),
    service.save(user("reviewer"), {
      configuration: configuration(10),
      expectedRevision: 0,
    }),
    service.resetPersonal(user("reviewer"), { expectedRevision: 2 }),
  ]) {
    await assert.rejects(operation, (error: unknown) => {
      return error instanceof ApiError && error.status === 409;
    });
  }
});

test("publishing only persists weights, not the admin's per-match result or filter options", async () => {
  const repository = new MemorySettingsRepository();
  const service = new MatchingSettingsService(repository);
  const customOptions = {
    ...configuration(30),
    result_limit: 30,
    hard_filters: { stage: false, geography: false },
    excluded_investor_types: ["angel"],
  };
  await service.save(user("admin"), {
    configuration: customOptions,
    expectedRevision: 1,
  });
  await service.save(user("reviewer"), {
    configuration: customOptions,
    expectedRevision: 0,
  });
  for (const role of ["admin", "reviewer", "founder"] as const) {
    const config = (await service.getForUser(user(role))).configuration;
    assert.equal(config.weights.sector_fit, 30);
    assert.equal(config.result_limit, 20);
    assert.deepEqual(config.hard_filters, { stage: true, geography: true });
    assert.deepEqual(config.excluded_investor_types, []);
  }
});

test("reset and recreate never allow an old personal revision to save or reset again", async () => {
  const service = new MatchingSettingsService(new MemorySettingsRepository());
  const reviewer = user("reviewer");
  const first = await service.save(reviewer, {
    configuration: configuration(30),
    expectedRevision: 0,
  });
  await service.resetPersonal(reviewer, { expectedRevision: first.personalRevision });
  const recreated = await service.save(reviewer, {
    configuration: configuration(35),
    expectedRevision: 0,
  });
  assert.ok(recreated.personalRevision! > first.personalRevision!);
  await assert.rejects(
    service.save(reviewer, {
      configuration: configuration(10),
      expectedRevision: first.personalRevision,
    }),
    { status: 409 },
  );
  await assert.rejects(
    service.resetPersonal(reviewer, { expectedRevision: first.personalRevision }),
    { status: 409 },
  );
  assert.equal(
    (await service.getForUser(reviewer)).configuration.weights.sector_fit,
    35,
  );
});
