import type { LogEntry } from "./types";

export const RECENT_FOOD_HISTORY_LIMIT = 100;

export function recentFoodHistory(
  logs: readonly LogEntry[],
  query = "",
  limit = RECENT_FOOD_HISTORY_LIMIT
): LogEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const boundedLimit = Math.max(0, limit);
  if (boundedLimit === 0) return [];
  const seen = new Set<string>();
  const unique: LogEntry[] = [];

  for (const entry of [...logs]
    .sort((a, b) => b.at - a.at)
    .filter((entry) => !normalizedQuery
      || entry.name.en.toLocaleLowerCase().includes(normalizedQuery)
      || entry.name.zh.toLocaleLowerCase().includes(normalizedQuery))) {
    const key = entry.refId
      ? `ref:${entry.refId}`
      : `name:${entry.name.en.trim().toLocaleLowerCase() || entry.name.zh.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
    if (unique.length >= boundedLimit) break;
  }

  return unique;
}
