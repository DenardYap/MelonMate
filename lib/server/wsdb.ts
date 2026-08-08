import type { WorkspaceDoc } from "@/lib/types";

/**
 * Workspace storage adapter.
 * 1. Upstash Redis / Vercel KV via REST (KV_REST_API_URL or UPSTASH_REDIS_REST_URL)
 * 2. Local file store in dev (.data/ws/*.json) so sync works out of the box
 * 3. Otherwise: unavailable -> API returns 503 with a setup hint
 */

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY_PREFIX = "melonmate:ws:";
const MAX_DOC_BYTES = 1_500_000;

export function storageAvailable(): boolean {
  return Boolean((KV_URL && KV_TOKEN) || process.env.NODE_ENV === "development");
}

async function kvCommand<T>(cmd: (string | number)[]): Promise<T> {
  const res = await fetch(KV_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kv ${res.status}`);
  const data = (await res.json()) as { result: T };
  return data.result;
}

/* ---------------- dev file store ---------------- */

async function fileGet(code: string): Promise<WorkspaceDoc | null> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  try {
    const p = path.join(process.cwd(), ".data", "ws", `${code}.json`);
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as WorkspaceDoc;
  } catch {
    return null;
  }
}

async function fileSet(code: string, doc: WorkspaceDoc): Promise<void> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "ws");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${code}.json`), JSON.stringify(doc));
}

async function fileCreate(code: string, doc: WorkspaceDoc): Promise<boolean> {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "ws");
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.writeFile(path.join(dir, `${code}.json`), JSON.stringify(doc), { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

/* ---------------- public API ---------------- */

export async function loadDoc(code: string): Promise<WorkspaceDoc | null> {
  if (KV_URL && KV_TOKEN) {
    const raw = await kvCommand<string | null>(["GET", KEY_PREFIX + code]);
    return raw ? (JSON.parse(raw) as WorkspaceDoc) : null;
  }
  if (process.env.NODE_ENV === "development") return fileGet(code);
  throw new Error("storage-unavailable");
}

export async function saveDoc(code: string, doc: WorkspaceDoc): Promise<void> {
  const raw = JSON.stringify(doc);
  if (raw.length > MAX_DOC_BYTES) throw new Error("doc-too-large");
  if (KV_URL && KV_TOKEN) {
    await kvCommand<string>(["SET", KEY_PREFIX + code, raw]);
    return;
  }
  if (process.env.NODE_ENV === "development") {
    await fileSet(code, doc);
    return;
  }
  throw new Error("storage-unavailable");
}

/** Reserve a brand-new workspace key. Redis NX and file wx make this atomic. */
export async function createDoc(code: string, doc: WorkspaceDoc): Promise<boolean> {
  const raw = JSON.stringify(doc);
  if (raw.length > MAX_DOC_BYTES) throw new Error("doc-too-large");
  if (KV_URL && KV_TOKEN) {
    const result = await kvCommand<string | null>(["SET", KEY_PREFIX + code, raw, "NX"]);
    return result === "OK";
  }
  if (process.env.NODE_ENV === "development") return fileCreate(code, doc);
  throw new Error("storage-unavailable");
}
