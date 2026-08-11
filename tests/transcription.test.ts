import { afterEach, describe, expect, it, vi } from "vitest";
import {
  preferredRecordingMimeType,
  recordingFileName,
  sanitizeTranscriptionKeywords,
} from "@/lib/transcription";

describe("voice transcription helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("chooses an OpenAI-supported browser recording format", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: (mime: string) => mime === "audio/webm;codecs=opus" });
    expect(preferredRecordingMimeType()).toBe("audio/webm;codecs=opus");
  });

  it("uses a matching upload extension", () => {
    expect(recordingFileName("audio/mp4")).toBe("food-note.m4a");
    expect(recordingFileName("audio/webm;codecs=opus")).toBe("food-note.webm");
  });

  it("cleans, deduplicates, and limits food-name keywords", () => {
    expect(sanitizeTranscriptionKeywords([" 雞蛋\n", "雞蛋", "<avocado>", "rice"], 3))
      .toEqual(["雞蛋", "avocado", "rice"]);
  });
});
