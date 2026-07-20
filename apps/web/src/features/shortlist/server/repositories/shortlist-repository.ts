import "server-only";

import {
  shortlistSourceSchema,
  type ShortlistSource,
} from "@/features/shortlist/types/shortlist";
import { getPool, type Queryable } from "@/lib/server/db";

const SLUG_SQL =
  "lower(regexp_replace(regexp_replace(canonical_name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))";

export type ShortlistRow = {
  id: string;
  investorId: string;
  source: ShortlistSource;
  createdAt: string;
  updatedAt: string;
};

type ShortlistDbRow = {
  id: string;
  investor_id: string;
  source: string;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: ShortlistDbRow): ShortlistRow {
  return {
    id: row.id,
    investorId: row.investor_id,
    source: shortlistSourceSchema.parse(row.source),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class ShortlistRepository {
  async listForUser(
    userId: string,
    client: Queryable = getPool(),
  ): Promise<ShortlistRow[]> {
    const result = await client.query(
      `SELECT
         id::text,
         investor_id::text,
         source,
         created_at,
         updated_at
       FROM user_shortlisted_investors
       WHERE user_id = $1
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId],
    );

    return (result.rows as ShortlistDbRow[]).map(mapRow);
  }

  async upsertForUser(
    input: {
      userId: string;
      investorIdOrSlug: string;
      source: ShortlistSource;
    },
    client: Queryable = getPool(),
  ): Promise<ShortlistRow | null> {
    const result = await client.query(
      `WITH resolved AS (
         SELECT id
         FROM investors
         WHERE deleted_at IS NULL
           AND (id::text = $2 OR ${SLUG_SQL} = lower($2))
         LIMIT 1
       )
       INSERT INTO user_shortlisted_investors (user_id, investor_id, source)
       SELECT $1, id, $3
       FROM resolved
       ON CONFLICT (user_id, investor_id)
       DO UPDATE SET
         source = EXCLUDED.source,
         deleted_at = NULL,
         updated_at = now()
       RETURNING
         id::text,
         investor_id::text,
         source,
         created_at,
         updated_at`,
      [input.userId, input.investorIdOrSlug, input.source],
    );

    const row = result.rows[0] as ShortlistDbRow | undefined;
    return row ? mapRow(row) : null;
  }

  async softDeleteForUser(
    input: { userId: string; investorIdOrSlug: string },
    client: Queryable = getPool(),
  ): Promise<string | null> {
    const result = await client.query(
      `WITH resolved AS (
         SELECT id
         FROM investors
         WHERE deleted_at IS NULL
           AND (id::text = $2 OR ${SLUG_SQL} = lower($2))
         LIMIT 1
       )
       UPDATE user_shortlisted_investors saved
       SET deleted_at = now(), updated_at = now()
       FROM resolved
       WHERE saved.user_id = $1
         AND saved.investor_id = resolved.id
         AND saved.deleted_at IS NULL
       RETURNING resolved.id::text AS investor_id`,
      [input.userId, input.investorIdOrSlug],
    );

    const row = result.rows[0] as { investor_id: string } | undefined;
    return row?.investor_id ?? null;
  }
}

export const shortlistRepository = new ShortlistRepository();
