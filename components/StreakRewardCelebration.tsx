"use client";

import { useEffect, useRef } from "react";
import { AppIcon } from "@/components/icons";
import { fireConfetti } from "@/components/ui";
import { useCelebrationQueue } from "@/lib/celebrationQueue";
import { sendStreakRewardNotification, successHaptic } from "@/lib/nativeApp";
import { playSound } from "@/lib/soundscape";
import { useStore } from "@/lib/store";
import { streakMilestoneAt } from "@/lib/streakRewards";

export default function StreakRewardCelebration() {
  const profileId = useStore((state) => state.activeProfileId);
  const lang = useStore((state) => state.lang);
  const reward = useStore((state) => state.game[state.activeProfileId]?.pendingStreakRewards?.[0] ?? null);
  const acknowledge = useStore((state) => state.acknowledgeStreakReward);
  const activeCelebration = useCelebrationQueue((state) => state.active);
  const requestCelebration = useCelebrationQueue((state) => state.request);
  const finishCelebration = useCelebrationQueue((state) => state.finish);
  const cancelCelebration = useCelebrationQueue((state) => state.cancel);
  const closeRef = useRef<HTMLButtonElement>(null);
  const notifiedRef = useRef(new Set<string>());
  const milestone = reward ? streakMilestoneAt(reward.days) : undefined;
  const celebrationKey = reward ? `streak-reward:${profileId}:${reward.days}` : null;
  const isActive = Boolean(celebrationKey && activeCelebration?.key === celebrationKey);

  useEffect(() => {
    if (!celebrationKey) return;
    requestCelebration({ key: celebrationKey, kind: "streak-reward", priority: 1 });
    return () => cancelCelebration(celebrationKey);
  }, [cancelCelebration, celebrationKey, requestCelebration]);

  useEffect(() => {
    if (!reward || !isActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const confettiTimer = window.setTimeout(() => fireConfetti(), 80);
    playSound("success");
    void successHaptic();
    const notificationKey = `${profileId}:${reward.days}`;
    if (!notifiedRef.current.has(notificationKey)) {
      notifiedRef.current.add(notificationKey);
      void sendStreakRewardNotification(reward, lang).catch(() => {});
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.clearTimeout(confettiTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  // dismiss is intentionally bound to the current milestone.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, reward?.days]);

  if (!reward || !milestone || !isActive) return null;

  const copy = lang === "zh" ? {
    eyebrow: "連續紀錄里程碑",
    title: `${reward.days} 天連續紀錄！`,
    badge: "新徽章",
    reward: reward.xp > 0 ? "獲得經驗" : "今日經驗已滿",
    detail: reward.xp > 0 ? "持續的健康選擇值得獎勵。" : "徽章已解鎖；XP 仍受每日 300 上限限制。",
    collect: "收藏徽章",
    dismiss: "關閉連續紀錄獎勵",
  } : {
    eyebrow: "Streak milestone",
    title: `${reward.days}-day streak!`,
    badge: "New badge",
    reward: reward.xp > 0 ? "XP earned" : "Daily XP full",
    detail: reward.xp > 0 ? "Consistent healthy choices deserve a reward." : "Your badge is unlocked; XP remains subject to the 300 daily cap.",
    collect: "Collect badge",
    dismiss: "Dismiss streak reward",
  };

  function dismiss() {
    if (!reward || !celebrationKey) return;
    finishCelebration(celebrationKey);
    acknowledge(reward.days);
  }

  return (
    <div className="achievement-modal-layer streak-reward-layer">
      <button className="achievement-modal-scrim" onClick={dismiss} aria-label={copy.dismiss} />
      <section className="achievement-modal streak-reward-modal" role="dialog" aria-modal="true" aria-labelledby="streak-reward-title">
        <div className="achievement-modal-stars" aria-hidden="true"><i /><i /><i /><i /></div>
        <span className="achievement-modal-badge tone-gold streak-reward-badge" aria-hidden="true">
          <AppIcon name="fire" size={39} />
          <i><AppIcon name="check" size={15} /></i>
        </span>
        <div className="achievement-modal-heading">
          <span><AppIcon name="spark" size={15} /> {copy.eyebrow}</span>
          <h2 id="streak-reward-title">{copy.title}</h2>
          <p>{copy.detail}</p>
        </div>
        <div className="achievement-modal-complete">
          <AppIcon name="medal" size={18} />
          <div><b>{copy.badge}</b><small>{milestone.name[lang]}</small></div>
          <AppIcon name="checkCircle" size={20} />
        </div>
        <div className="achievement-modal-rewards">
          <b>{copy.reward}</b>
          <span className="is-xp"><AppIcon name="star" size={16} /> +{reward.xp.toLocaleString()} XP</span>
        </div>
        <button ref={closeRef} className="achievement-modal-continue press" onClick={dismiss}>
          {copy.collect} <AppIcon name="next" size={18} />
        </button>
      </section>
    </div>
  );
}
