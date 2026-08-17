import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDoc } from "./wsdb";
import type { WorkspaceDoc } from "../types";

const createdFiles: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(createdFiles.splice(0).map((file) => fs.unlink(file).catch(() => undefined)));
});

describe("workspace creation", () => {
  it("atomically lets only one creator reserve a friend code", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const randomValue = Number.parseInt(crypto.randomUUID().replaceAll("-", "").slice(0, 10), 16);
    const code = (randomValue % 1_000_000).toString().padStart(6, "0");
    createdFiles.push(path.join(process.cwd(), ".data", "ws", `${code}.json`));
    const doc: WorkspaceDoc = { rev: 0, shared: null, members: {} };

    const attempts = await Promise.all([
      createDoc(code, doc),
      createDoc(code, doc),
      createDoc(code, doc),
      createDoc(code, doc),
    ]);

    expect(attempts.filter(Boolean)).toHaveLength(1);
  });
});
