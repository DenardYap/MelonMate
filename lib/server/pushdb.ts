import { promises as fs } from "node:fs";
import path from "node:path";

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY_PREFIX = "melonmate:push:";

export interface PushDeviceRecord {
  deviceId: string;
  token: string;
  platform: "ios" | "android";
  lang: "en" | "zh";
  timezone: string;
  updatedAt: number;
}

export function pushStorageAvailable(): boolean {
  return Boolean((KV_URL && KV_TOKEN) || process.env.NODE_ENV === "development");
}

export async function savePushDevice(record: PushDeviceRecord): Promise<void> {
  const raw = JSON.stringify(record);
  if (KV_URL && KV_TOKEN) {
    const response = await fetch(KV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", KEY_PREFIX + record.deviceId, raw]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`kv ${response.status}`);
    return;
  }
  if (process.env.NODE_ENV === "development") {
    const directory = path.join(process.cwd(), ".data", "push");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, `${record.deviceId}.json`), raw);
    return;
  }
  throw new Error("storage-unavailable");
}

export async function loadPushDevice(deviceId: string): Promise<PushDeviceRecord | null> {
  if (KV_URL && KV_TOKEN) {
    const response = await fetch(KV_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", KEY_PREFIX + deviceId]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`kv ${response.status}`);
    const data = (await response.json()) as { result?: string | null };
    return data.result ? JSON.parse(data.result) as PushDeviceRecord : null;
  }
  if (process.env.NODE_ENV === "development") {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), ".data", "push", `${deviceId}.json`), "utf8");
      return JSON.parse(raw) as PushDeviceRecord;
    } catch {
      return null;
    }
  }
  throw new Error("storage-unavailable");
}
