import { dateStr } from "./dates";

export const DAILY_PROGRESS_PROMPT_HOUR = 22;

export function shouldPromptDailyProgress({
  now,
  lastPromptDate,
  friendCount,
  sharedToday,
  workoutInProgress = false,
}: {
  now: Date;
  lastPromptDate: string | null;
  friendCount: number;
  sharedToday: boolean;
  workoutInProgress?: boolean;
}): boolean {
  const today = dateStr(now);
  return friendCount > 0
    && !sharedToday
    && !workoutInProgress
    && lastPromptDate !== today
    && now.getHours() >= DAILY_PROGRESS_PROMPT_HOUR;
}

export function millisecondsUntilDailyProgressPrompt(now: Date): number {
  const next = new Date(now);
  next.setHours(DAILY_PROGRESS_PROMPT_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
