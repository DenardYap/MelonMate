"use client";

import { useEffect, useRef } from "react";
import { AppIcon } from "@/components/icons";
import { fireConfetti } from "@/components/ui";
import { useCelebrationQueue } from "@/lib/celebrationQueue";
import { useHealthRewardQueue } from "@/lib/healthRewards";
import { sendHealthRewardNotification, successHaptic } from "@/lib/nativeApp";
import { playSound } from "@/lib/soundscape";
import { useStore } from "@/lib/store";
import { healthWorkoutXp } from "@/lib/game";

export default function HealthRewardCelebration() {
  const lang = useStore((state) => state.lang);
  const pending = useHealthRewardQueue((state) => state.pending);
  const dismissReward = useHealthRewardQueue((state) => state.dismiss);
  const activeCelebration = useCelebrationQueue((state) => state.active);
  const requestCelebration = useCelebrationQueue((state) => state.request);
  const finishCelebration = useCelebrationQueue((state) => state.finish);
  const cancelCelebration = useCelebrationQueue((state) => state.cancel);
  const closeRef = useRef<HTMLButtonElement>(null);
  const notificationIds = useRef(new Set<string>());
  const reward = pending[0] ?? null;
  const celebrationKey = reward ? `health-reward:${reward.id}` : null;
  const isActive = Boolean(celebrationKey && activeCelebration?.key === celebrationKey);

  useEffect(() => {
    if (!celebrationKey) return;
    requestCelebration({ key: celebrationKey, kind: "health-reward", priority: 0 });
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
    if (!notificationIds.current.has(reward.id)) {
      notificationIds.current.add(reward.id);
      void sendHealthRewardNotification(reward, lang).catch(() => {});
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
  // dismiss is intentionally bound to the current reward.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, reward?.id]);

  if (!reward || !isActive) return null;

  const copy = lang === "zh" ? {
    eyebrow: "活動里程碑",
    title: "今天動得真棒！",
    today: "今日 Apple 健康",
    steps: "步",
    stand: "站立分鐘",
    stepReward: "步數獎勵",
    standReward: "站立獎勵",
    workoutReward: "訓練獎勵",
    calories: "大卡",
    total: "獲得經驗",
    collect: "領取 XP",
    dismiss: "關閉活動獎勵",
  } : {
    eyebrow: "Activity milestone",
    title: "Great movement today!",
    today: "Today from Apple Health",
    steps: "steps",
    stand: "standing min",
    stepReward: "Step reward",
    standReward: "Standing reward",
    workoutReward: "Workout reward",
    calories: "cal",
    total: "XP earned",
    collect: "Collect XP",
    dismiss: "Dismiss activity reward",
  };

  function dismiss() {
    if (!reward || !celebrationKey) return;
    finishCelebration(celebrationKey);
    dismissReward(reward.id);
  }

  return (
    <div className="health-reward-layer">
      <button className="health-reward-scrim" onClick={dismiss} aria-label={copy.dismiss} />
      <section className="health-reward-modal" role="dialog" aria-modal="true" aria-labelledby="health-reward-title">
        <span className="health-reward-badge" aria-hidden="true"><AppIcon name="heart" size={36} /></span>
        <header>
          <span><AppIcon name="spark" size={15} /> {copy.eyebrow}</span>
          <h2 id="health-reward-title">{copy.title}</h2>
          <p>{copy.today}</p>
        </header>
        <div className="health-reward-totals tabular">
          <span><AppIcon name="stretch" size={18} /><b>{reward.steps.toLocaleString()}</b> {copy.steps}</span>
          <span><AppIcon name="timer" size={18} /><b>{reward.standMinutes.toLocaleString()}</b> {copy.stand}</span>
        </div>
        {reward.workouts.length > 0 && (
          <div className="health-reward-workouts">
            {reward.workouts.map((workout) => (
              <span key={workout.id}>
                <AppIcon name="gym" size={18} />
                <b>{workout.activityType}</b>
                <small>{Math.round(workout.durationMinutes)} min · {Math.round(workout.activeCalories)} {copy.calories}</small>
                <em className="health-workout-xp">+{workout.earnedXp ?? healthWorkoutXp(workout.durationMinutes)} XP</em>
              </span>
            ))}
          </div>
        )}
        <div className="health-reward-breakdown">
          {reward.stepXp > 0 && <span><AppIcon name="stretch" size={18} /><b>{copy.stepReward}</b><em>+{reward.stepXp} XP</em></span>}
          {reward.standXp > 0 && <span><AppIcon name="timer" size={18} /><b>{copy.standReward}</b><em>+{reward.standXp} XP</em></span>}
          {reward.workoutXp > 0 && <span><AppIcon name="gym" size={18} /><b>{copy.workoutReward}</b><em>+{reward.workoutXp} XP</em></span>}
          <strong><AppIcon name="star" size={20} /><b>{copy.total}</b><em>+{reward.totalXp} XP</em></strong>
        </div>
        <button ref={closeRef} className="health-reward-collect press" onClick={dismiss}>
          {copy.collect} <AppIcon name="next" size={18} />
        </button>
      </section>
    </div>
  );
}
