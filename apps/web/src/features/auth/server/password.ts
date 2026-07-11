import "server-only";

import { randomInt } from "node:crypto";

// Excludes visually ambiguous characters (0/O, 1/l/I) since this password
// gets typed once from an invitation email.
const TEMPORARY_PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(length = 16): string {
  let password = "";
  for (let index = 0; index < length; index += 1) {
    password +=
      TEMPORARY_PASSWORD_CHARSET[randomInt(TEMPORARY_PASSWORD_CHARSET.length)];
  }
  return password;
}
