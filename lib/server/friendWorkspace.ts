import type { MemberSnapshot, WorkspaceDoc } from "@/lib/types";

export const MAX_FRIEND_CODE_MEMBERS = 250;

export function memberView(
  doc: WorkspaceDoc,
  publisherId: string,
  recipientId: string
): MemberSnapshot | undefined {
  return doc.memberViews?.[publisherId]?.[recipientId] ?? doc.members[publisherId];
}

/**
 * Return only the members visible in this friendship. The code owner can see
 * everyone who added them; every other member can see only themselves and the
 * owner. Directed snapshots preserve each pair's individual sharing settings.
 */
export function workspaceForViewer(doc: WorkspaceDoc, viewerId: string): WorkspaceDoc {
  if (!doc.ownerId) return doc;

  if (viewerId === doc.ownerId) {
    return {
      rev: doc.rev,
      shared: doc.shared,
      ownerId: doc.ownerId,
      members: Object.fromEntries(
        Object.keys(doc.members).flatMap((memberId) => {
          const visible = memberId === viewerId
            ? doc.members[memberId]
            : memberView(doc, memberId, viewerId);
          return visible ? [[memberId, visible] as const] : [];
        })
      ),
    };
  }

  const owner = memberView(doc, doc.ownerId, viewerId);
  const self = doc.members[viewerId];
  return {
    rev: doc.rev,
    shared: doc.shared,
    ownerId: doc.ownerId,
    members: Object.fromEntries([
      ...(owner ? [[doc.ownerId, owner] as const] : []),
      ...(self ? [[viewerId, self] as const] : []),
    ]),
  };
}

export function canShareWith(doc: WorkspaceDoc, publisherId: string, recipientId: string): boolean {
  if (!doc.ownerId || !doc.members[recipientId] || publisherId === recipientId) return false;
  return publisherId === doc.ownerId || recipientId === doc.ownerId;
}
