import { randomInt } from "node:crypto";

export const FRIEND_CODE_SPACE = 1_000_000;

/** Produce a display-friendly numeric code while preserving leading zeroes. */
export function generateFriendCode(pick: (max: number) => number = randomInt): string {
  return pick(FRIEND_CODE_SPACE).toString().padStart(6, "0");
}
