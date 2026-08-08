import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createDoc, storageAvailable } from "@/lib/server/wsdb";
import type { MemberSnapshot, WorkspaceDoc } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;
const CREATE_ATTEMPTS = 12;

function generateInviteCode(): string {
  let tail = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    tail += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `MELON-${tail}`;
}

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  if (!storageAvailable()) return bad(503, "sync-not-configured");

  let body: { member?: MemberSnapshot };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad(400, "bad-json");
  }
  if (!body.member || typeof body.member.id !== "string") return bad(400, "bad-member");

  try {
    for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt += 1) {
      const code = generateInviteCode();
      const doc: WorkspaceDoc = {
        rev: 0,
        shared: null,
        members: {
          [body.member.id]: { ...body.member, updatedAt: Date.now() },
        },
      };
      if (await createDoc(code, doc)) {
        return NextResponse.json({ code, doc }, { status: 201 });
      }
    }
    return bad(503, "invite-code-unavailable");
  } catch (error) {
    const message = error instanceof Error ? error.message : "storage-error";
    return bad(message === "doc-too-large" ? 413 : 503, message);
  }
}
