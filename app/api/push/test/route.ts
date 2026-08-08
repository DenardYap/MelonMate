import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { apnsConfigured, sendApnsAlert } from "@/lib/server/apns";
import { loadPushDevice } from "@/lib/server/pushdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.PUSH_ADMIN_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!apnsConfigured()) return NextResponse.json({ error: "apns-not-configured" }, { status: 503 });

  let body: { deviceId?: string; title?: string; body?: string; path?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!body.deviceId || !body.title || !body.body) {
    return NextResponse.json({ error: "deviceId-title-body-required" }, { status: 400 });
  }
  if (body.path && (!body.path.startsWith("/") || body.path.startsWith("//"))) {
    return NextResponse.json({ error: "bad-path" }, { status: 400 });
  }

  const device = await loadPushDevice(body.deviceId);
  if (!device) return NextResponse.json({ error: "device-not-found" }, { status: 404 });
  if (device.platform !== "ios") return NextResponse.json({ error: "ios-only" }, { status: 400 });

  try {
    await sendApnsAlert(device.token, {
      title: body.title.slice(0, 100),
      body: body.body.slice(0, 300),
      path: body.path,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "apns-failed" },
      { status: 502 }
    );
  }
}
