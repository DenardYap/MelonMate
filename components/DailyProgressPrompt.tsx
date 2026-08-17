"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/icons";
import { Sheet } from "@/components/ui";
import { dateStr } from "@/lib/dates";
import { millisecondsUntilDailyProgressPrompt, shouldPromptDailyProgress } from "@/lib/dailyProgressPrompt";
import { memberIdFor } from "@/lib/sync";
import { useStore } from "@/lib/store";

const PROMPT_STORAGE_KEY = "melonmate-daily-progress-prompt-v1";

export default function DailyProgressPrompt() {
  const router = useRouter();
  const lang = useStore((state) => state.lang);
  const friends = useStore((state) => state.friends);
  const activeProfileId = useStore((state) => state.activeProfileId);
  const deviceId = useStore((state) => state.ws.deviceId);
  const dailyProgress = useStore((state) => state.friendDailyProgress);
  const workoutInProgress = useStore((state) => (state.sessions[state.activeProfileId] ?? []).some((session) => !session.endedAt));
  const [open, setOpen] = useState(false);

  const check = useCallback(() => {
    const now = new Date();
    const today = dateStr(now);
    const lastPromptDate = localStorage.getItem(PROMPT_STORAGE_KEY);
    const sharedToday = Object.values(dailyProgress).some((progress) => progress.date === today);
    const selfId = memberIdFor(activeProfileId, deviceId);
    setOpen(shouldPromptDailyProgress({
      now,
      lastPromptDate,
      friendCount: Object.values(friends).filter((friend) => friend.id !== selfId).length,
      sharedToday,
      workoutInProgress,
    }));
  }, [activeProfileId, dailyProgress, deviceId, friends, workoutInProgress]);

  useEffect(() => {
    check();
    let timer = 0;
    const schedule = () => {
      const delay = Math.min(millisecondsUntilDailyProgressPrompt(new Date()), 2_147_000_000);
      timer = window.setTimeout(() => {
        check();
        schedule();
      }, delay + 250);
    };
    schedule();
    const whenVisible = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [check]);

  const dismiss = () => {
    localStorage.setItem(PROMPT_STORAGE_KEY, dateStr(new Date()));
    setOpen(false);
  };

  return (
    <Sheet open={open} onClose={dismiss} title={<span className="icon-label"><AppIcon name="moon" size={20} />{lang === "zh" ? "分享今天的進度？" : "Share today’s progress?"}</span>}>
      <div className="daily-progress-prompt">
        <span className="empty-icon"><AppIcon name="friends" size={28} /></span>
        <div>
          <div className="font-bold">{lang === "zh" ? "讓朋友為今天的成果加油" : "Let a friend cheer on today’s wins"}</div>
          <div className="t-sub mt-1">{lang === "zh" ? "選擇朋友，傳送一次性的營養、活動與連續紀錄摘要。你可以先預覽再分享。" : "Choose friends and send a one-time nutrition, activity, and streak snapshot. You’ll preview it before sharing."}</div>
        </div>
      </div>
      <button className="btn btn-primary press w-full mt-4" onClick={() => { dismiss(); router.push("/friends?share=daily"); }}><AppIcon name="upload" size={18} />{lang === "zh" ? "選擇朋友並分享" : "Choose friends and share"}</button>
      <button className="btn btn-ghost press w-full mt-2" onClick={dismiss}>{lang === "zh" ? "今晚不用" : "Not tonight"}</button>
    </Sheet>
  );
}
