import { describe, expect, it } from "vitest";
import { FRIEND_CODE_SPACE, generateFriendCode } from "./friendCode";

describe("friend codes", () => {
  it("always formats the selected value as exactly six digits", () => {
    expect(generateFriendCode(() => 7)).toBe("000007");
    expect(generateFriendCode(() => FRIEND_CODE_SPACE - 1)).toBe("999999");
  });
});
