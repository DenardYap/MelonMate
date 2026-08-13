import { describe, expect, it } from "vitest";
import { friendSharePushCopy } from "./friendPush";
import type { FriendShareNotification, MemberSnapshot } from "../types";

const SOURCE = { name: "Mina" } as MemberSnapshot;
const recipe: FriendShareNotification = {
  id: "one",
  friendId: "mina",
  friendName: "Mina",
  kind: "recipe",
  itemId: "soup",
  itemName: { en: "Melon soup", zh: "哈密瓜湯" },
  createdAt: 10,
  path: "/kitchen?tab=shared&friend=mina",
};

describe("friend share push copy", () => {
  it("links a single recipe alert to the shared meal tab", () => {
    expect(friendSharePushCopy(SOURCE, [recipe], "en")).toEqual({
      title: "Mina shared a recipe",
      body: "Melon soup",
      path: recipe.path,
    });
  });

  it("summarizes several shared items", () => {
    const workout = { ...recipe, id: "two", kind: "workout" as const, itemId: "plan" };
    expect(friendSharePushCopy(SOURCE, [recipe, workout], "en").body).toBe("1 recipe and 1 workout");
  });
});
