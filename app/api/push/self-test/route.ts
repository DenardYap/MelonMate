import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { apnsConfigured, sendApnsAlert } from "@/lib/server/apns";
import { loadPushDevice, savePushDevice } from "@/lib/server/pushdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEVICE_ID_RE = /^[A-Za-z0-9._-]{8,128}$/;
const TOKEN_RE = /^[A-Za-z0-9:_-]{32,512}$/;
const TEST_COOLDOWN_MS = 60_000;

function tokensMatch(supplied: string, stored: string): boolean {
  return supplied.length === stored.length
    && timingSafeEqual(Buffer.from(supplied), Buffer.from(stored));
}

export async function POST(request: Request) {
  if (!apnsConfigured()) {
    return NextResponse.json({ error: "apns-not-configured" }, { status: 503 });
  }

  let body: { deviceId?: string; token?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (
    typeof body.deviceId !== "string" || !DEVICE_ID_RE.test(body.deviceId)
    || typeof body.token !== "string" || !TOKEN_RE.test(body.token)
  ) {
    return NextResponse.json({ error: "bad-push-test" }, { status: 400 });
  }

  const device = await loadPushDevice(body.deviceId);
  if (!device || device.platform !== "ios" || !tokensMatch(body.token, device.token)) {
    return NextResponse.json({ error: "device-not-found" }, { status: 404 });
  }
  const now = Date.now();
  if (device.lastTestAt && now - device.lastTestAt < TEST_COOLDOWN_MS) {
    return NextResponse.json({ error: "push-test-rate-limited" }, { status: 429 });
  }

  try {
    await sendApnsAlert(device.token, {
      title: device.lang === "zh" ? "MelonMate 推播已連線" : "MelonMate push is connected",
      body: device.lang === "zh"
        ? "這則通知已透過 Vercel 與 Apple 推播服務送達。"
        : "This notification arrived through Vercel and Apple Push Notification service.",
      path: "/me",
    });
    await savePushDevice({ ...device, lastTestAt: now });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "apns-failed" },
      { status: 502 }
    );
  }
}
