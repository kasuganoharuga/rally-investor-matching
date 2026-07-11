import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import type { UserRole } from "@/features/auth/types/auth";

/**
 * Carries data between provisionUser() and the Better Auth
 * databaseHooks it triggers, without smuggling it through the
 * sign-up request body (which is client-controllable and has
 * `role` locked to `input: false`).
 *
 * `createdUserId` starts unset and is written by
 * databaseHooks.user.create.after once Better Auth actually
 * inserts the row — it is the only trustworthy evidence that a
 * user was created by *this* call, not a later observation of
 * "does a user with this email exist".
 */
export type ProvisioningContext = {
  role: UserRole;
  invitedBy?: string;
  createdUserId?: string;
};

const provisioningContextStorage = new AsyncLocalStorage<ProvisioningContext>();

export function withProvisioningContext<T>(
  context: ProvisioningContext,
  fn: () => Promise<T>,
): Promise<T> {
  return provisioningContextStorage.run(context, fn);
}

export function getProvisioningContext(): ProvisioningContext | undefined {
  return provisioningContextStorage.getStore();
}
