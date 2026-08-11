export const MAX_VOICE_RECORDING_MS = 60_000;
export const MAX_VOICE_AUDIO_BYTES = 10 * 1024 * 1024;

const RECORDING_MIME_TYPES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
] as const;

/** Prefer an OpenAI-supported recording container available in this browser. */
export function preferredRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return undefined;
  }
  return RECORDING_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}
export function recordingFileName(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("mp4") || normalized.includes("m4a")) return "food-note.m4a";
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "food-note.mp3";
  if (normalized.includes("wav")) return "food-note.wav";
  return "food-note.webm";
}

/** OpenAI rejects keywords with markup or newlines; keep the contextual list small and literal. */
export function sanitizeTranscriptionKeywords(value: unknown, limit = 40): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((keyword) => String(keyword).trim().replace(/[<>\r\n]/g, ""))
    .filter(Boolean)
    .map((keyword) => keyword.slice(0, 80)))]
    .slice(0, limit);
}
