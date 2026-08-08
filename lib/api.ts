export const NATIVE_API_ORIGIN_MISSING = "native-api-origin-missing";

export class NativeApiOriginMissingError extends Error {
  readonly code = "NATIVE_API_ORIGIN_MISSING";

  constructor() {
    super(NATIVE_API_ORIGIN_MISSING);
    this.name = "NativeApiOriginMissingError";
  }
}

export function isNativeApiOriginMissingError(error: unknown): boolean {
  return error instanceof NativeApiOriginMissingError
    || (error instanceof Error && error.message === NATIVE_API_ORIGIN_MISSING);
}

export function nativeApiUnavailableMessage(lang: "en" | "zh", feature: "text" | "photo"): string {
  if (feature === "photo") {
    return lang === "zh"
      ? "原生版尚未連接圖片分析服務。你仍可掃描條碼，或使用「自訂」輸入營養。"
      : "The native app is not connected to photo analysis yet. You can still scan a barcode or use Custom.";
  }
  return lang === "zh"
    ? "原生版尚未連接食物分析服務。請從下方搜尋結果選擇食材，或使用「自訂」輸入營養。"
    : "The native app is not connected to food analysis yet. Choose an ingredient below, or use Custom to enter nutrition.";
}

/** Resolve a hosted Next.js API route from both the website and native bundle. */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = (process.env.NEXT_PUBLIC_API_ORIGIN || "").replace(/\/$/, "");
  if (origin) return `${origin}${normalizedPath}`;
  if (process.env.NEXT_PUBLIC_CAPACITOR_BUILD === "1") {
    throw new NativeApiOriginMissingError();
  }
  return normalizedPath;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
