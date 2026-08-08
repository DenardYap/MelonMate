"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/icons";
import { fireConfetti } from "@/components/ui";
import { useCelebrationQueue } from "@/lib/celebrationQueue";
import { gardenAchievements, type GardenAchievement } from "@/lib/gardenAchievements";
import { useGarden, useGardenStore } from "@/lib/gardenStore";
import { successHaptic } from "@/lib/nativeApp";
import { playSound } from "@/lib/soundscape";
import { useStore } from "@/lib/store";

export default function AchievementCelebration() {
  const profileId = useStore((state) => state.activeProfileId);
  const onboarded = useStore((state) => state.onboarded);
  const lang = useStore((state) => state.lang);
  const garden = useGarden(profileId);
  const acknowledgeAchievements = useGardenStore((state) => state.acknowledgeAchievements);
  const activeCelebration = useCelebrationQueue((state) => state.active);
  const requestCelebration = useCelebrationQueue((state) => state.request);
  const finishCelebration = useCelebrationQueue((state) => state.finish);
  const cancelCelebration = useCelebrationQueue((state) => state.cancel);
  const continueRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<GardenAchievement[]>([]);

  const newlyUnlocked = useMemo(
    () => gardenAchievements(garden).filter(
      (achievement) => achievement.earned && !garden.achievementRewardClaims.includes(achievement.id)
    ),
    [garden]
  );
  const newlyUnlockedKey = newlyUnlocked.map((achievement) => achievement.id).join("|");

  useEffect(() => {
    if (!onboarded || newlyUnlocked.length === 0) return;
    setPending((current) => {
      const currentIds = new Set(current.map((achievement) => achievement.id));
      const additions = newlyUnlocked.filter((achievement) => !currentIds.has(achievement.id));
      return additions.length ? [...current, ...additions] : current;
    });
  // newlyUnlockedKey is the stable identity of the derived achievement list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyUnlockedKey, onboarded]);

  const celebrationKey = pending.length ? `achievement:${profileId}:${pending[0].id}` : null;
  const celebrationIsActive = Boolean(celebrationKey && activeCelebration?.key === celebrationKey);

  useEffect(() => {
    if (!celebrationKey) return;
    requestCelebration({ key: celebrationKey, kind: "achievement", priority: 1 });
    return () => cancelCelebration(celebrationKey);
  }, [cancelCelebration, celebrationKey, requestCelebration]);

  useEffect(() => {
    if (!celebrationIsActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => continueRef.current?.focus());
    const confettiTimer = window.setTimeout(() => fireConfetti(), 90);
    playSound("success");
    void successHaptic();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrationIsActive]);

  if (!celebrationIsActive || pending.length === 0) return null;

  const [primary, ...alsoUnlocked] = pending;
  const totalReward = pending.reduce(
    (total, achievement) => ({
      xp: total.xp + achievement.reward.xp,
      dew: total.dew + achievement.reward.dew,
    }),
    { xp: 0, dew: 0 }
  );
  const copy = lang === "zh" ? {
    eyebrow: "成就解鎖",
    completed: "挑戰完成",
    rewards: "你的獎勵",
    dew: "露珠",
    also: `同時解鎖 ${alsoUnlocked.length} 個徽章`,
    continue: "領取獎勵",
    dismiss: "關閉成就畫面",
  } : {
    eyebrow: "Achievement unlocked",
    completed: "Challenge complete",
    rewards: "Your rewards",
    dew: "Dew",
    also: `${alsoUnlocked.length} more badge${alsoUnlocked.length === 1 ? "" : "s"} unlocked`,
    continue: "Collect rewards",
    dismiss: "Dismiss achievement celebration",
  };

  function dismiss() {
    if (!celebrationKey) return;
    acknowledgeAchievements(profileId, pending.map((achievement) => achievement.id));
    finishCelebration(celebrationKey);
    setPending([]);
  }

  return (
    <div className="achievement-modal-layer">
      <button className="achievement-modal-scrim" onClick={dismiss} aria-label={copy.dismiss} />
      <section className="achievement-modal" role="dialog" aria-modal="true" aria-labelledby="achievement-modal-title">
        <div className="achievement-modal-stars" aria-hidden="true"><i /><i /><i /><i /></div>
        <span className={`achievement-modal-badge tone-${primary.tone}`} aria-hidden="true">
          <AppIcon name={primary.icon} size={39} />
          <i><AppIcon name="check" size={15} /></i>
        </span>
        <div className="achievement-modal-heading">
          <span><AppIcon name="spark" size={15} /> {copy.eyebrow}</span>
          <h2 id="achievement-modal-title">{primary.name[lang]}</h2>
          <p>{primary.description[lang]}</p>
        </div>
        <div className="achievement-modal-complete">
          <AppIcon name="trophy" size={18} />
          <div><b>{copy.completed}</b><small>{primary.target.toLocaleString()} / {primary.target.toLocaleString()}</small></div>
          <AppIcon name="checkCircle" size={20} />
        </div>
        <div className="achievement-modal-rewards">
          <b>{copy.rewards}</b>
          <span className="is-xp"><AppIcon name="star" size={16} /> +{totalReward.xp.toLocaleString()} XP</span>
          <span className="is-dew"><AppIcon name="water" size={16} /> +{totalReward.dew.toLocaleString()} {copy.dew}</span>
        </div>
        {alsoUnlocked.length > 0 && (
          <div className="achievement-modal-more">
            <h3>{copy.also}</h3>
            {alsoUnlocked.map((achievement) => (
              <div key={achievement.id}>
                <span className={`tone-${achievement.tone}`}><AppIcon name={achievement.icon} size={17} /></span>
                <b>{achievement.name[lang]}</b>
                <small>+{achievement.reward.xp.toLocaleString()} XP · +{achievement.reward.dew.toLocaleString()} {copy.dew}</small>
              </div>
            ))}
          </div>
        )}
        <button ref={continueRef} className="achievement-modal-continue press" onClick={dismiss}>
          {copy.continue} <AppIcon name="next" size={18} />
        </button>
      </section>
    </div>
  );
}
