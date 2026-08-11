import { NextResponse } from "next/server";
import {
  MAX_VOICE_AUDIO_BYTES,
  sanitizeTranscriptionKeywords,
} from "@/lib/transcription";

export const runtime = "nodejs";

const COMMON_FOOD_KEYWORDS = [
  "avocado toast",
  "protein shake",
  "Greek yogurt",
  "chicken breast",
  "bubble milk tea",
  "Coke Zero",
  "雞蛋",
  "酪梨吐司",
  "無糖豆漿",
  "珍珠奶茶",
  "雞胸肉",
  "地瓜",
  "白飯",
  "蛋白粉",
];

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI transcription is not configured yet.", code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_VOICE_AUDIO_BYTES + 100_000) {
    return NextResponse.json({ error: "The voice recording is too large." }, { status: 413 });
  }

  let audio: File;
  let keywords: string[] = [];
  try {
    const body = await request.formData();
    const file = body.get("file");
    if (!(file instanceof File)) throw new Error("missing audio");
    audio = file;
    const rawKeywords = body.get("keywords");
    if (typeof rawKeywords === "string") {
      try {
        keywords = sanitizeTranscriptionKeywords(JSON.parse(rawKeywords));
      } catch {
        keywords = [];
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid voice recording." }, { status: 400 });
  }

  if (!audio.size || audio.size > MAX_VOICE_AUDIO_BYTES || !isSupportedAudio(audio)) {
    return NextResponse.json(
      { error: "Use an MP4, M4A, WebM, MP3, or WAV recording under 10 MB." },
      { status: 400 }
    );
  }

  const form = new FormData();
  form.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-transcribe");
  form.append("file", audio, safeAudioFileName(audio));
  form.append(
    "prompt",
    "The speaker is logging foods, drinks, and portion amounts. Transcribe exactly in the original language. Speech may mix English and Chinese. For Chinese speech, use Traditional Chinese characters. Preserve numbers, quantities, brands, and food names."
  );
  for (const keyword of sanitizeTranscriptionKeywords([...COMMON_FOOD_KEYWORDS, ...keywords])) {
    form.append("keywords[]", keyword);
  }
  form.append("languages[]", "zh");
  form.append("languages[]", "en");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const data = await response.json() as { text?: unknown; error?: { message?: string } };
    if (!response.ok) {
      console.error("OpenAI food transcription failed", response.status, data.error?.message);
      return NextResponse.json({ error: "The voice recording could not be transcribed. Try again." }, { status: 502 });
    }
    const text = typeof data.text === "string" ? data.text.trim().slice(0, 500) : "";
    if (!text) {
      return NextResponse.json({ error: "No speech was detected. Try speaking a little closer to the microphone." }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "The voice recording could not be transcribed. Try again." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
function isSupportedAudio(file: File): boolean {
  const mime = file.type.toLowerCase().split(";", 1)[0];
  if (["audio/mp4", "audio/x-m4a", "audio/m4a", "audio/webm", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "video/mp4"].includes(mime)) {
    return true;
  }
  return /\.(?:mp4|m4a|webm|mp3|wav)$/i.test(file.name);
}

function safeAudioFileName(file: File): string {
  const match = file.name.match(/\.(mp4|m4a|webm|mp3|wav)$/i);
  if (match) return `food-note.${match[1].toLowerCase()}`;
  const mime = file.type.toLowerCase();
  if (mime.includes("mp4") || mime.includes("m4a")) return "food-note.m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "food-note.mp3";
  if (mime.includes("wav")) return "food-note.wav";
  return "food-note.webm";
}
