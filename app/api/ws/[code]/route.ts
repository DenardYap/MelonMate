import { NextRequest, NextResponse } from "next/server";
import { loadDoc, saveDoc, storageAvailable } from "@/lib/server/wsdb";
import type { MemberSnapshot, WorkspaceShared } from "@/lib/types";
import { detectFriendShareNotifications } from "@/lib/friendNotifications";
import { sendFriendSharePushes } from "@/lib/server/friendPush";

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
    return NextResponse.json(doc);
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

  let body: { shared?: WorkspaceShared; member?: MemberSnapshot };
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

    let sharePush: {
      source: MemberSnapshot;
      recipients: MemberSnapshot[];
      notifications: ReturnType<typeof detectFriendShareNotifications>;
    } | undefined;
    if (body.member && typeof body.member.id === "string") {
      const isNew = !doc.members[body.member.id];
      if (isNew && Object.keys(doc.members).length >= MAX_MEMBERS) {
        return bad(409, "space-full");
      }
      const previous = doc.members[body.member.id];
      const member = { ...body.member, updatedAt: Date.now() };
      doc.members[body.member.id] = member;
      if (previous) {
        const notifications = detectFriendShareNotifications(previous, member);
        const recipients = Object.values(doc.members).filter((candidate) => candidate.id !== member.id);
        sharePush = { source: member, recipients, notifications };
      }
    }

    await saveDoc(code, doc);
    if (sharePush) {
      await sendFriendSharePushes(sharePush.source, sharePush.recipients, sharePush.notifications);
    }
    return NextResponse.json(doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "storage-error";
    return bad(msg === "doc-too-large" ? 413 : 503, msg);
  }
}
