import { NextResponse } from "next/server";
import { pushStorageAvailable, savePushDevice, type PushDeviceRecord } from "@/lib/server/pushdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEVICE_ID_RE = /^[A-Za-z0-9._-]{8,128}$/;
const TOKEN_RE = /^[A-Za-z0-9:_-]{32,512}$/;

export async function POST(request: Request) {
  if (!pushStorageAvailable()) {
    return NextResponse.json({ error: "push-storage-not-configured" }, { status: 503 });
  }

  let body: Partial<PushDeviceRecord>;
  try {
    body = (await request.json()) as Partial<PushDeviceRecord>;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (
    typeof body.deviceId !== "string" || !DEVICE_ID_RE.test(body.deviceId)
    || typeof body.token !== "string" || !TOKEN_RE.test(body.token)
    || (body.platform !== "ios" && body.platform !== "android")
  ) {
    return NextResponse.json({ error: "bad-push-registration" }, { status: 400 });
  }

  const record: PushDeviceRecord = {
    deviceId: body.deviceId,
    token: body.token,
    platform: body.platform,
    lang: body.lang === "zh" ? "zh" : "en",
    timezone: typeof body.timezone === "string" ? body.timezone.slice(0, 80) : "UTC",
    updatedAt: Date.now(),
  };

  try {
    await savePushDevice(record);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "push-storage-error" },
      { status: 503 }
    );
  }
}
