import { describe, expect, it } from "vitest";
import { canShareWith, workspaceForViewer } from "./friendWorkspace";
import type { MemberSnapshot, WorkspaceDoc } from "../types";

function member(id: string, name = id): MemberSnapshot {
  return {
    version: 9,
    id,
    name,
    emoji: "🍈",
    level: 1,
    xp: 0,
    streak: 0,
    best: 0,
    melons: 0,
    golden: 0,
    theme: "honeydew",
    updatedAt: 1,
  };
}

describe("permanent friend-code visibility", () => {
  const doc: WorkspaceDoc = {
    rev: 3,
    shared: null,
    ownerId: "owner",
    members: {
      owner: member("owner", "Owner base"),
      alice: member("alice"),
      bob: member("bob"),
    },
    memberViews: {
      owner: {
        alice: member("owner", "Owner for Alice"),
        bob: member("owner", "Owner for Bob"),
      },
      alice: { owner: member("alice", "Alice for Owner") },
    },
  };

  it("lets the owner see every friend using each directed snapshot", () => {
    const visible = workspaceForViewer(doc, "owner");
    expect(Object.keys(visible.members)).toEqual(["owner", "alice", "bob"]);
    expect(visible.members.alice.name).toBe("Alice for Owner");
    expect(visible.memberViews).toBeUndefined();
  });

  it("keeps friends isolated from one another", () => {
    const visible = workspaceForViewer(doc, "alice");
    expect(Object.keys(visible.members)).toEqual(["owner", "alice"]);
    expect(visible.members.owner.name).toBe("Owner for Alice");
    expect(visible.members.bob).toBeUndefined();
  });

  it("only permits sharing between the owner and a friend", () => {
    expect(canShareWith(doc, "owner", "alice")).toBe(true);
    expect(canShareWith(doc, "alice", "owner")).toBe(true);
    expect(canShareWith(doc, "alice", "bob")).toBe(false);
  });
});
