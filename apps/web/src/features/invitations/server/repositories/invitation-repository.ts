import "server-only";

import type { PoolClient } from "pg";

import { userRoleSchema } from "@/features/auth/types/auth";
import { InvitationError } from "@/features/invitations/server/errors";
import {
  invitationStatusSchema,
  type InvitationSummary,
} from "@/features/invitations/types/invitation";
import { getPool, isPostgresError, type Queryable } from "@/lib/server/db";

const SELECT_COLUMNS = `
  id,
  email,
  role,
  status,
  invited_by,
  accepted_by,
  expires_at,
  accepted_at,
  created_at,
  updated_at
`;

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_by: string | null;
  accepted_by: string | null;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: InvitationRow): InvitationSummary {
  return {
    id: row.id,
    email: row.email,
    role: userRoleSchema.parse(row.role),
    status: invitationStatusSchema.parse(row.status),
    invitedBy: row.invited_by,
    acceptedBy: row.accepted_by,
    expiresAt: row.expires_at.toISOString(),
    acceptedAt: row.accepted_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function insertPending(
  input: {
    email: string;
    role: string;
    invitedBy: string;
    token: string;
    expiresAt: Date;
  },
  client: Queryable = getPool(),
): Promise<InvitationSummary> {
  try {
    const result = await client.query(
      `INSERT INTO invitations (email, role, token, status, invited_by, expires_at)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [input.email, input.role, input.token, input.invitedBy, input.expiresAt],
    );
    return mapRow(result.rows[0] as InvitationRow);
  } catch (error) {
    // `23505` is a unique_violation, but this table has two different
    // unique constraints — only the pending-per-email one has business
    // meaning here. A token collision (astronomically unlikely) should
    // surface as a plain 500, not be misreported as "already invited".
    if (
      isPostgresError(error) &&
      error.code === "23505" &&
      error.constraint === "idx_invitations_pending_email"
    ) {
      throw new InvitationError("INVITATION_ALREADY_PENDING");
    }
    throw error;
  }
}

/**
 * Locks the invitation row for the duration of the caller's
 * transaction. Must only be called with a client from
 * withTransaction() — taking a row lock via a one-off pool query would
 * release it before the caller can act on it.
 */
export async function findInvitationForUpdate(
  client: PoolClient,
  id: string,
): Promise<InvitationSummary | null> {
  const result = await client.query(
    `SELECT ${SELECT_COLUMNS} FROM invitations WHERE id = $1 FOR UPDATE`,
    [id],
  );
  const row = result.rows[0] as InvitationRow | undefined;
  return row ? mapRow(row) : null;
}

export async function markAccepted(
  id: string,
  userId: string,
  client: Queryable = getPool(),
): Promise<boolean> {
  const result = await client.query(
    `UPDATE invitations
     SET status = 'accepted', accepted_by = $2, accepted_at = now(), updated_at = now()
     WHERE id = $1 AND status = 'pending'`,
    [id, userId],
  );
  return result.rowCount === 1;
}

export async function markRevoked(
  id: string,
  client: Queryable = getPool(),
): Promise<boolean> {
  const result = await client.query(
    `UPDATE invitations
     SET status = 'revoked', updated_at = now()
     WHERE id = $1 AND status = 'pending'`,
    [id],
  );
  return result.rowCount === 1;
}

export async function markExpired(
  id: string,
  client: Queryable = getPool(),
): Promise<boolean> {
  const result = await client.query(
    `UPDATE invitations
     SET status = 'expired', updated_at = now()
     WHERE id = $1 AND status = 'pending'`,
    [id],
  );
  return result.rowCount === 1;
}

export async function findById(
  id: string,
  options: { onlyInvitedBy?: string } = {},
  client: Queryable = getPool(),
): Promise<InvitationSummary | null> {
  const params: unknown[] = [id];
  const conditions = ["id = $1"];
  if (options.onlyInvitedBy) {
    params.push(options.onlyInvitedBy);
    conditions.push(`invited_by = $${params.length}`);
  }

  const result = await client.query(
    `SELECT ${SELECT_COLUMNS} FROM invitations WHERE ${conditions.join(" AND ")}`,
    params,
  );
  const row = result.rows[0] as InvitationRow | undefined;
  return row ? mapRow(row) : null;
}

export async function findByToken(
  token: string,
  client: Queryable = getPool(),
): Promise<InvitationSummary | null> {
  const result = await client.query(
    `SELECT ${SELECT_COLUMNS} FROM invitations WHERE token = $1 AND deleted_at IS NULL`,
    [token],
  );
  const row = result.rows[0] as InvitationRow | undefined;
  return row ? mapRow(row) : null;
}

export async function listAll(
  client: Queryable = getPool(),
): Promise<InvitationSummary[]> {
  const result = await client.query(
    `SELECT ${SELECT_COLUMNS} FROM invitations ORDER BY created_at DESC`,
  );
  return (result.rows as InvitationRow[]).map(mapRow);
}

export async function listByInviter(
  inviterId: string,
  client: Queryable = getPool(),
): Promise<InvitationSummary[]> {
  const result = await client.query(
    `SELECT ${SELECT_COLUMNS} FROM invitations WHERE invited_by = $1 ORDER BY created_at DESC`,
    [inviterId],
  );
  return (result.rows as InvitationRow[]).map(mapRow);
}
