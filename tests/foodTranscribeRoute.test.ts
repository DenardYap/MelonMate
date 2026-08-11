import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/food-transcribe/route";

describe("food transcription route", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_TRANSCRIPTION_MODEL;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.OPENAI_TRANSCRIPTION_MODEL;
    else process.env.OPENAI_TRANSCRIPTION_MODEL = originalModel;
  });

  it("sends bilingual food context and returns the transcript", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ text: "兩顆雞蛋和一片 avocado toast" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));
    const inbound = new FormData();
    inbound.append("file", new File([new Uint8Array([1, 2, 3])], "note.webm", { type: "audio/webm" }));
    inbound.append("keywords", JSON.stringify(["Bernard's oats", "番茄炒蛋"]));

    const response = await POST(new Request("http://localhost/api/food-transcribe", { method: "POST", body: inbound }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ text: "兩顆雞蛋和一片 avocado toast" });

    const [, init] = upstream.mock.calls[0];
    const sent = init?.body as FormData;
    expect(sent.get("model")).toBe("gpt-transcribe");
    expect(sent.getAll("languages[]")).toEqual(["zh", "en"]);
    expect(sent.getAll("keywords[]")).toContain("番茄炒蛋");
    expect(sent.get("prompt")).toContain("Traditional Chinese");
  });

  it("fails clearly when transcription is not configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const response = await POST(new Request("http://localhost/api/food-transcribe", { method: "POST" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "AI_NOT_CONFIGURED" });
  });
});
