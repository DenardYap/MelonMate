"use client";

import { useState } from "react";
import { AppIcon, type IconName } from "@/components/icons";
import { GlassCard, Sheet } from "@/components/ui";
import {
  DAILY_XP_CAP,
  DAILY_XP_REWARD,
  FOOD_LOG_XP_REWARD,
  HEALTH_WORKOUT_REWARDED_MINUTES_CAP,
  HEALTH_WORKOUT_XP_PER_MINUTE,
  IN_APP_WORKOUT_EXERCISE_XP,
  IN_APP_WORKOUT_SET_XP,
  MAX_DAILY_REWARDED_FOOD_LOGS,
  MAX_PLAYER_LEVEL,
  STAND_DAILY_TIER_CAP,
  STAND_MINUTES_INCREMENT,
  STAND_XP_PER_TIER,
  STEP_DAILY_TIER_CAP,
  STEP_INCREMENT,
  WEIGHT_LOG_XP_REWARD,
} from "@/lib/game";
import { GARDEN_DAILY_BONUS } from "@/lib/garden";
import { useStore } from "@/lib/store";
import { STREAK_MILESTONES } from "@/lib/streakRewards";

type Guide = "xp" | "dew";

interface GuideItem {
  icon: IconName;
  title: string;
  detail: string;
}

export default function RewardGuideSettings() {
  const lang = useStore((state) => state.lang);
  const [guide, setGuide] = useState<Guide | null>(null);

  const xpItems: GuideItem[] = lang === "zh" ? [
    { icon: "cutlery", title: "記錄食物", detail: `每天前 ${MAX_DAILY_REWARDED_FOOD_LOGS} 筆各 +${FOOD_LOG_XP_REWARD} XP。刪除後重新記錄不會重複獲獎。` },
    { icon: "goal", title: "完成每日飲食目標", detail: `記錄至少 3 筆食物且不超過熱量目標，隔天結算 +${DAILY_XP_REWARD} XP。` },
    { icon: "fire", title: "達成連續紀錄里程碑", detail: `${STREAK_MILESTONES.map((milestone) => `${milestone.days} 天 +${milestone.xp}`).join("、")} XP；每個徽章只獎勵一次。` },
    { icon: "weight", title: "記錄體重", detail: `每天第一次記錄 +${WEIGHT_LOG_XP_REWARD} XP。` },
    { icon: "stretch", title: "Apple 健康步數", detail: `每 ${STEP_INCREMENT.toLocaleString()} 步達成一個里程碑，每天計至 ${(STEP_INCREMENT * STEP_DAILY_TIER_CAP).toLocaleString()} 步；後段里程碑獎勵較高。` },
    { icon: "timer", title: "Apple 健康站立", detail: `每 ${STAND_MINUTES_INCREMENT} 分鐘 +${STAND_XP_PER_TIER} XP，每天計至 ${STAND_MINUTES_INCREMENT * STAND_DAILY_TIER_CAP} 分鐘。` },
    { icon: "heart", title: "Apple Watch 訓練", detail: `每個有效訓練分鐘 +${HEALTH_WORKOUT_XP_PER_MINUTE} XP，每天最多計 ${HEALTH_WORKOUT_REWARDED_MINUTES_CAP} 分鐘。` },
    { icon: "gym", title: "App 內訓練", detail: `每個完成組數 +${IN_APP_WORKOUT_SET_XP} XP；完成動作的所有組數再 +${IN_APP_WORKOUT_EXERCISE_XP} XP。` },
  ] : [
    { icon: "cutlery", title: "Log food", detail: `The first ${MAX_DAILY_REWARDED_FOOD_LOGS} entries each day earn +${FOOD_LOG_XP_REWARD} XP. Deleting and re-adding an entry cannot earn it twice.` },
    { icon: "goal", title: "Complete the daily food goal", detail: `Log at least 3 items and stay at or below your calorie target to receive +${DAILY_XP_REWARD} XP when the day is evaluated.` },
    { icon: "fire", title: "Reach streak milestones", detail: `${STREAK_MILESTONES.map((milestone) => `${milestone.days} days +${milestone.xp}`).join(", ")} XP. Each badge pays out once.` },
    { icon: "weight", title: "Log your weight", detail: `Your first weight check-in each day earns +${WEIGHT_LOG_XP_REWARD} XP.` },
    { icon: "stretch", title: "Apple Health steps", detail: `Reach a milestone every ${STEP_INCREMENT.toLocaleString()} steps, up to ${(STEP_INCREMENT * STEP_DAILY_TIER_CAP).toLocaleString()} steps per day. Later milestones are worth more.` },
    { icon: "timer", title: "Apple Health standing", detail: `Earn +${STAND_XP_PER_TIER} XP per ${STAND_MINUTES_INCREMENT} standing minutes, up to ${STAND_MINUTES_INCREMENT * STAND_DAILY_TIER_CAP} minutes per day.` },
    { icon: "heart", title: "Apple Watch workouts", detail: `Earn +${HEALTH_WORKOUT_XP_PER_MINUTE} XP per valid workout minute, up to ${HEALTH_WORKOUT_REWARDED_MINUTES_CAP} minutes per day.` },
    { icon: "gym", title: "In-app workouts", detail: `Earn +${IN_APP_WORKOUT_SET_XP} XP per completed set, plus +${IN_APP_WORKOUT_EXERCISE_XP} XP for completing every set in an exercise.` },
  ];

  const dewItems: GuideItem[] = lang === "zh" ? [
    { icon: "fruit", title: "收成成熟作物", detail: "每種瓜都有自己的露珠價值。農場建築與活躍夥伴可以提高收成。" },
    { icon: "spark", title: "觸發蜜糖豐收", detail: "蜂房第 3 階有機會讓該株作物的最終露珠獎勵變成 2 倍。" },
    { icon: "goal", title: "完成每日農場任務", detail: `領取每項任務顯示的露珠；完成整組任務再獲得 +${GARDEN_DAILY_BONUS.dew} 露珠。` },
    { icon: "cutlery", title: "交付農場訂單", detail: "市集看板的每日與每週訂單會獎勵露珠；連續完成每日訂單還有守護者里程碑獎勵。" },
    { icon: "medal", title: "領取農場成就", detail: "種植、收成、建造、夥伴、咒語與訂單成就都會提供一次性露珠獎勵。" },
  ] : [
    { icon: "fruit", title: "Harvest ripe crops", detail: "Every melon has its own Dew value. Farm buildings and active companions can increase the payout." },
    { icon: "spark", title: "Trigger Honeyed Harvest", detail: "A Tier 3 Apiary can double the final Dew payout from an individual crop." },
    { icon: "goal", title: "Complete daily farm quests", detail: `Claim the Dew shown on each quest, plus +${GARDEN_DAILY_BONUS.dew} Dew for completing the full daily set.` },
    { icon: "cutlery", title: "Deliver farm orders", detail: "Daily and weekly Market Board orders award Dew. Completing every daily order also advances Stewardship milestones." },
    { icon: "medal", title: "Claim farm achievements", detail: "Planting, harvesting, building, companion, spell, and order achievements provide one-time Dew rewards." },
  ];

  const items = guide === "dew" ? dewItems : xpItems;
  const title = guide === "dew"
    ? (lang === "zh" ? "如何獲得露珠？" : "How do I get Dew?")
    : (lang === "zh" ? "如何獲得 XP？" : "How do I get XP?");

  return (
    <>
      <GlassCard className="px-4 py-2 mb-4">
        <button type="button" className="row row-button press" onClick={() => setGuide("xp")}>
          <span className="icon-tile reward-guide-setting-icon is-xp"><AppIcon name="star" size={19} /></span>
          <span className="flex-1">
            <b>{lang === "zh" ? "如何獲得 XP？" : "How do I get XP?"}</b>
            <small className="t-cap mt-1">{lang === "zh" ? "查看所有飲食與健身獎勵" : "See every food and fitness reward"}</small>
          </span>
          <AppIcon name="next" size={17} />
        </button>
        <button type="button" className="row row-button press" onClick={() => setGuide("dew")}>
          <span className="icon-tile reward-guide-setting-icon is-dew"><AppIcon name="water" size={19} /></span>
          <span className="flex-1">
            <b>{lang === "zh" ? "如何獲得露珠？" : "How do I get Dew?"}</b>
            <small className="t-cap mt-1">{lang === "zh" ? "查看所有農場獎勵" : "See every farm reward"}</small>
          </span>
          <AppIcon name="next" size={17} />
        </button>
      </GlassCard>

      {guide && (
        <Sheet open onClose={() => setGuide(null)} title={<span className="icon-label"><AppIcon name={guide === "xp" ? "star" : "water"} />{title}</span>}>
          <div className={`reward-guide-sheet is-${guide}`}>
            <p className="t-sub">
              {guide === "xp"
                ? (lang === "zh"
                    ? `所有 XP 來源共享每日 ${DAILY_XP_CAP} XP 上限。農場不會產生 XP；目前等級進度最高為等級 ${MAX_PLAYER_LEVEL}。`
                    : `All XP sources share a ${DAILY_XP_CAP} XP daily cap. The farm never awards XP, and the current progression track ends at Level ${MAX_PLAYER_LEVEL}.`)
                : (lang === "zh"
                    ? "露珠只來自農場活動，沒有每日上限，也不會提高玩家等級。"
                    : "Dew comes only from farm activity, has no daily cap, and does not raise your player level.")}
            </p>
            <div className="reward-guide-list">
              {items.map((item) => (
                <article key={item.title}>
                  <span><AppIcon name={item.icon} size={20} /></span>
                  <div><b>{item.title}</b><small>{item.detail}</small></div>
                </article>
              ))}
            </div>
            {guide === "dew" && (
              <aside className="reward-guide-note">
                <AppIcon name="idea" size={18} />
                <span>{lang === "zh" ? "露珠可用來購買種子、解鎖田地、升級建築、領養夥伴，以及購買與精通咒語。" : "Spend Dew on seeds, field expansions, building upgrades, companions, and buying or mastering spells."}</span>
              </aside>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
