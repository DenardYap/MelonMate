import { NextRequest, NextResponse } from "next/server";
import { loadDoc, saveDoc, storageAvailable } from "@/lib/server/wsdb";
import type { MemberSnapshot, WorkspaceShared } from "@/lib/types";
import { detectFriendShareNotifications } from "@/lib/friendNotifications";
import { sendFriendSharePushes } from "@/lib/server/friendPush";
import {
  canShareWith,
  MAX_FRIEND_CODE_MEMBERS,
  memberView,
  workspaceForViewer,
} from "@/lib/server/friendWorkspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Z0-9-]{6,32}$/;
const MAX_MEMBERS = 2;

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  if (!CODE_RE.test(code)) return bad(400, "bad-code");
  if (!storageAvailable()) return bad(503, "sync-not-configured");
  try {
    const doc = await loadDoc(code);
    if (!doc) return bad(404, "space-not-found");
    // A read without a member update may reveal the code owner, never the
    // other people who have used that code.
    return NextResponse.json(workspaceForViewer(doc, ""));
  } catch (e) {
    return bad(503, e instanceof Error ? e.message : "storage-error");
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  if (!CODE_RE.test(code)) return bad(400, "bad-code");
  if (!storageAvailable()) return bad(503, "sync-not-configured");

  let body: {
    shared?: WorkspaceShared;
    member?: MemberSnapshot;
    recipientId?: string;
    views?: Record<string, MemberSnapshot>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad(400, "bad-json");
  }

  try {
    const doc = await loadDoc(code);
    if (!doc) return bad(404, "space-not-found");

    if (body.shared) {
      doc.shared = body.shared;
      doc.rev += 1;
    }

    const sharePushes: Array<{
      source: MemberSnapshot;
      recipients: MemberSnapshot[];
      notifications: ReturnType<typeof detectFriendShareNotifications>;
    }> = [];
    if (body.member && typeof body.member.id === "string") {
      const isNew = !doc.members[body.member.id];
      const memberLimit = doc.ownerId ? MAX_FRIEND_CODE_MEMBERS : MAX_MEMBERS;
      if (isNew && Object.keys(doc.members).length >= memberLimit) {
        return bad(409, doc.ownerId ? "friend-limit" : "space-full");
      }
      const member = { ...body.member, updatedAt: Date.now() };

      if (doc.ownerId && body.recipientId) {
        if (!canShareWith(doc, member.id, body.recipientId)) return bad(400, "bad-recipient");
        const previous = memberView(doc, member.id, body.recipientId);
        doc.memberViews ??= {};
        doc.memberViews[member.id] ??= {};
        doc.memberViews[member.id][body.recipientId] = member;
        // A non-owner is never visible to other friends, so its directed view
        // can also be its base record. The owner's base snapshot stays private.
        if (member.id !== doc.ownerId) doc.members[member.id] = member;
        if (previous) {
          sharePushes.push({
            source: member,
            recipients: [doc.members[body.recipientId]],
            notifications: detectFriendShareNotifications(previous, member),
          });
        }
      } else {
        const previous = doc.members[member.id];
        doc.members[member.id] = member;
        if (previous && !doc.ownerId) {
          sharePushes.push({
            source: member,
            recipients: Object.values(doc.members).filter((candidate) => candidate.id !== member.id),
            notifications: detectFriendShareNotifications(previous, member),
          });
        }
      }

      if (doc.ownerId && body.views && member.id === doc.ownerId) {
        for (const [recipientId, snapshot] of Object.entries(body.views)) {
          if (snapshot.id !== member.id || !canShareWith(doc, member.id, recipientId)) continue;
          const previous = memberView(doc, member.id, recipientId);
          const directed = { ...snapshot, updatedAt: Date.now() };
          doc.memberViews ??= {};
          doc.memberViews[member.id] ??= {};
          doc.memberViews[member.id][recipientId] = directed;
          if (previous) {
            sharePushes.push({
              source: directed,
              recipients: [doc.members[recipientId]],
              notifications: detectFriendShareNotifications(previous, directed),
            });
          }
        }
      }
    }

    await saveDoc(code, doc);
    for (const push of sharePushes) {
      await sendFriendSharePushes(push.source, push.recipients, push.notifications);
    }
    return NextResponse.json(body.member ? workspaceForViewer(doc, body.member.id) : doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "storage-error";
    return bad(msg === "doc-too-large" ? 413 : 503, msg);
  }
}
