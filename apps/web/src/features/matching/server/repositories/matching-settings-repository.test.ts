import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { Pool } from "pg";

import { MatchingSettingsRepository } from "@/features/matching/server/repositories/matching-settings-repository";
import { DEFAULT_MATCHING_CONFIGURATION } from "@/features/matching/types/match";

// Opt-in integration test against a disposable QA database only. User/settings
// rows are rolled back, while sequence gaps are intentionally retained.
const databaseUrl = process.env.RALLY_TEST_DATABASE_URL;

test(
  "PostgreSQL personal revisions survive reset/recreate and migration reapplication",
  {
    skip: !databaseUrl,
  },
  async () => {
    const target = new URL(databaseUrl!);
    assert.ok(["localhost", "127.0.0.1"].includes(target.hostname));
    assert.match(target.pathname, /(?:_qa|_test)$/);
    const pool = new Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    const repository = new MatchingSettingsRepository();
    const migration = readFileSync(
      resolve("../../data/patches/202609_matching_settings.sql"),
      "utf8",
    )
      .split(/\r?\n/)
      .filter((line) => !["BEGIN;", "COMMIT;"].includes(line.trim().toUpperCase()))
      .join("\n");
    try {
      await client.query("BEGIN");
      await client.query(migration);
      const userId = `qa-revision-${randomUUID()}`;
      await client.query(
        `INSERT INTO "user" (id, name, email, role)
       VALUES ($1, 'Revision QA', $2, 'reviewer')`,
        [userId, `${userId}@example.invalid`],
      );
      const configuration = structuredClone(DEFAULT_MATCHING_CONFIGURATION);
      assert.equal(
        await repository.savePersonal(userId, configuration, 0, client),
        true,
      );
      const first = await repository.getPersonal(userId, client);
      assert.ok(first);
      assert.equal(
        await repository.resetPersonal(userId, first.revision, client),
        true,
      );
      assert.equal(
        await repository.savePersonal(userId, configuration, 0, client),
        true,
      );
      const recreated = await repository.getPersonal(userId, client);
      assert.ok(recreated && recreated.revision > first.revision);
      assert.equal(
        await repository.savePersonal(userId, configuration, first.revision, client),
        false,
      );
      assert.equal(
        await repository.resetPersonal(userId, first.revision, client),
        false,
      );
      assert.equal(
        await repository.savePersonal(
          userId,
          configuration,
          recreated.revision,
          client,
        ),
        true,
      );
      const updated = await repository.getPersonal(userId, client);
      assert.ok(updated && updated.revision > recreated.revision);

      // Reapply must retain the sequence high-water mark even when its latest
      // revision's row has already been deleted.
      assert.equal(
        await repository.resetPersonal(userId, updated.revision, client),
        true,
      );
      await client.query(migration);
      assert.equal(
        await repository.savePersonal(userId, configuration, 0, client),
        true,
      );
      const afterReapply = await repository.getPersonal(userId, client);
      assert.ok(afterReapply && afterReapply.revision > updated.revision);

      // A pre-sequence row with a higher revision must also be respected.
      const legacyRevision = afterReapply.revision + 50;
      await client.query(
        "UPDATE matching_reviewer_settings SET revision = $2 WHERE user_id = $1",
        [userId, legacyRevision],
      );
      await client.query(migration);
      assert.equal(
        await repository.savePersonal(userId, configuration, legacyRevision, client),
        true,
      );
      assert.ok(
        (await repository.getPersonal(userId, client))!.revision > legacyRevision,
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  },
);
