export type QuickLogMode = "scan" | "photo";

function cleanOrigin(raw?: string): string {
  const value = raw?.trim();
  if (!value) return "";
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(normalized).origin;
  } catch {
    return "";
  }
}

export function quickLogUrl({
  mode,
  native,
  currentOrigin,
  publicOrigin,
}: {
  mode: QuickLogMode;
  native: boolean;
  currentOrigin: string;
  publicOrigin?: string;
}): string {
  if (native) return `melonmate://add?mode=${mode}&source=lock-screen`;
  const origin = cleanOrigin(publicOrigin) || cleanOrigin(currentOrigin);
  return `${origin}/add?mode=${mode}&source=lock-screen`;
}
