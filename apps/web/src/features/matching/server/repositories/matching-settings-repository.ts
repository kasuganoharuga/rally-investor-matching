import "server-only";

import {
  matchingConfigurationSchema,
  type MatchingConfiguration,
} from "@/features/matching/types/match";
import { getPool, type Queryable } from "@/lib/server/db";

export type StoredMatchingSettings = {
  configuration: MatchingConfiguration;
  revision: number;
};

function mapRow(row: { configuration: unknown; revision: number }) {
  return {
    configuration: matchingConfigurationSchema.parse(row.configuration),
    revision: row.revision,
  };
}

export class MatchingSettingsRepository {
  async getGlobal(client: Queryable = getPool()): Promise<StoredMatchingSettings> {
    const result = await client.query(
      "SELECT configuration, revision FROM matching_global_settings WHERE singleton = true",
    );
    if (!result.rows[0]) {
      throw new Error("Matching settings migration has not been applied.");
    }
    return mapRow(result.rows[0]);
  }

  async getPersonal(
    userId: string,
    client: Queryable = getPool(),
  ): Promise<StoredMatchingSettings | null> {
    const result = await client.query(
      "SELECT configuration, revision FROM matching_reviewer_settings WHERE user_id = $1",
      [userId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async saveGlobal(
    userId: string,
    configuration: MatchingConfiguration,
    expectedRevision: number,
    client: Queryable = getPool(),
  ): Promise<boolean> {
    const result = await client.query(
      `UPDATE matching_global_settings
       SET configuration = $1::jsonb, revision = revision + 1,
           updated_by = $2, updated_at = now()
       WHERE singleton = true AND revision = $3
       RETURNING revision`,
      [JSON.stringify(configuration), userId, expectedRevision],
    );
    return result.rows.length === 1;
  }

  async savePersonal(
    userId: string,
    configuration: MatchingConfiguration,
    expectedRevision: number,
    client: Queryable = getPool(),
  ): Promise<boolean> {
    // Revisions come from a non-repeating database sequence. Reset/delete followed
    // by recreation cannot let a stale tab match a newly reused revision (ABA).
    const result =
      expectedRevision === 0
        ? await client.query(
            `INSERT INTO matching_reviewer_settings (user_id, configuration)
             VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO NOTHING RETURNING revision`,
            [userId, JSON.stringify(configuration)],
          )
        : await client.query(
            `UPDATE matching_reviewer_settings
             SET configuration = $2::jsonb,
                 revision = nextval('matching_reviewer_settings_revision_seq'),
                 updated_at = now()
             WHERE user_id = $1 AND revision = $3 RETURNING revision`,
            [userId, JSON.stringify(configuration), expectedRevision],
          );
    return result.rows.length === 1;
  }

  async resetPersonal(
    userId: string,
    expectedRevision: number,
    client: Queryable = getPool(),
  ): Promise<boolean> {
    const result = await client.query(
      `DELETE FROM matching_reviewer_settings
       WHERE user_id = $1 AND revision = $2 RETURNING user_id`,
      [userId, expectedRevision],
    );
    return result.rows.length === 1;
  }
}
