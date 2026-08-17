"use client";

import Image from "next/image";
import { Fragment, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppIcon, FoodGlyph, MealGlyph, iconFromLegacy } from "@/components/icons";
import ProfileAvatar from "@/components/ProfileAvatar";
import { GlassCard, Segmented, Sheet, toast } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { cropProgress, cropStageImage, cropVisualStage, varietyById } from "@/lib/garden";
import { GARDEN_ACHIEVEMENT_DEFINITIONS } from "@/lib/gardenAchievements";
import { fmt1, fmtNum } from "@/lib/nutrition";
import { useActiveProfile, useStore } from "@/lib/store";
import { THEME_VISUALS } from "@/lib/themes";
import type { Lang, LogEntry, MealSlot, MemberSnapshot, Recipe, ThemeId } from "@/lib/types";
import { convertWeightUnit, seedWeightInUnit } from "@/lib/workouts";
import { syncNow } from "@/lib/sync";

type FriendTab = "overview" | "meals" | "training" | "farm";
const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const COPY = {
  en: {
    profile: "Friend profile",
    overview: "Overview",
    meals: "Meals",
    training: "Training",
    farm: "Farm",
    sharedView: "Friend activity",
    updated: "Updated",
    level: "Level",
    nextLevel: "to next level",
    streak: "Day streak",
    best: "Best streak",
    harvests: "Harvests",
    workouts: "Workouts",
    appleHealth: "Apple Health",
    steps: "Steps",
    stand: "Stand minutes",
    healthWorkouts: "Health workouts",
    noHealth: "No Apple Health activity has been synced yet.",
    noSharedMeals: "No meal content is shared.",
    noSharedTraining: "No training content is shared.",
    noSharedFarm: "Farm activity is not shared.",
    badges: "Badges",
    noBadges: "No badges earned yet.",
    activeTheme: "Active theme",
    recentFoods: "Recently logged foods",
    noFoodLogs: "No food logs are available yet.",
    weightTrend: "Weight trend",
    weightGained: "Gained",
    weightLost: "Lost",
    weightUnchanged: "No change",
    actualWeightPrivate: "Only the change is shared. Their actual weight stays private.",
    today: "Today",
    calories: "Calories",
    protein: "Protein",
    consistency: "Last seven days",
    recentTraining: "Recent training",
    noRecentTraining: "No completed workouts yet.",
    mealPlan: "Upcoming meal plan",
    noMeals: "No meals are planned for the next seven days.",
    sharedRecipes: "Saved recipes",
    saveRecipe: "Save to my recipes",
    recipeSaved: "Recipe saved to your Meal page",
    addMealPlan: "Add to my meal plan",
    addMealPlanTitle: "Use this meal plan",
    addMealPlanHint: "Recipes will be copied to your library. Choose whether to keep or replace meals already planned on the same dates.",
    mergePlan: "Add alongside my meals",
    replacePlan: "Replace those dates",
    planAddedOne: "meal added to your plan",
    planAddedMany: "meals added to your plan",
    servings: "servings",
    serving: "serving",
    ingredients: "Ingredients",
    method: "Method",
    perServing: "Per serving",
    activePlan: "Active workout plan",
    noWorkoutPlan: "No active workout plan yet.",
    useWorkoutPlan: "Use this workout plan",
    workoutPlanSaved: "Workout plan copied and selected",
    completed: "Completed",
    volume: "Total volume",
    prs: "PRs",
    week: "Week",
    sets: "sets",
    farmProgress: "Farm progress",
    dew: "Dew",
    plots: "Plots",
    collection: "Harvest collection",
    emptyPlot: "Empty plot",
    ready: "Ready",
    growing: "Growing",
    emptyCollection: "No melons harvested yet.",
    legacy: "This detail will appear after your friend updates and syncs their app.",
    missing: "Friend not found",
    missingHint: "Refresh the Friends screen or ask them to join your circle again.",
    backFriends: "Back to friends",
  },
  zh: {
    profile: "朋友檔案",
    overview: "總覽",
    meals: "餐點",
    training: "訓練",
    farm: "農場",
    sharedView: "朋友動態",
    updated: "更新於",
    level: "等級",
    nextLevel: "升級所需",
    streak: "連續天數",
    best: "最佳連勝",
    harvests: "收成",
    workouts: "訓練次數",
    appleHealth: "Apple 健康",
    steps: "步數",
    stand: "站立分鐘",
    healthWorkouts: "健康訓練",
    noHealth: "尚未同步 Apple 健康活動。",
    noSharedMeals: "目前沒有分享餐點內容。",
    noSharedTraining: "目前沒有分享訓練內容。",
    noSharedFarm: "目前沒有分享農場活動。",
    badges: "徽章",
    noBadges: "尚未獲得徽章。",
    activeTheme: "目前主題",
    recentFoods: "最近飲食記錄",
    noFoodLogs: "尚無飲食記錄。",
    weightTrend: "體重趨勢",
    weightGained: "增加",
    weightLost: "減少",
    weightUnchanged: "沒有變化",
    actualWeightPrivate: "只分享增減幅度，實際體重保持私密。",
    today: "今天",
    calories: "熱量",
    protein: "蛋白質",
    consistency: "近七天",
    recentTraining: "最近訓練",
    noRecentTraining: "尚無已完成的訓練。",
    mealPlan: "未來餐點計畫",
    noMeals: "未來七天尚未安排餐點。",
    sharedRecipes: "已儲存食譜",
    saveRecipe: "儲存到我的食譜",
    recipeSaved: "食譜已儲存到「餐點」頁",
    addMealPlan: "加入我的餐點計畫",
    addMealPlanTitle: "使用此餐點計畫",
    addMealPlanHint: "食譜會複製到你的收藏。請選擇保留或取代相同日期已安排的餐點。",
    mergePlan: "加入現有餐點",
    replacePlan: "取代這些日期",
    planAddedOne: "筆餐點已加入計畫",
    planAddedMany: "筆餐點已加入計畫",
    servings: "份",
    serving: "份",
    ingredients: "食材",
    method: "作法",
    perServing: "每份",
    activePlan: "目前訓練計畫",
    noWorkoutPlan: "目前沒有使用中的訓練計畫。",
    useWorkoutPlan: "使用此訓練計畫",
    workoutPlanSaved: "訓練計畫已複製並選用",
    completed: "已完成",
    volume: "總訓練量",
    prs: "個人紀錄",
    week: "第",
    sets: "組",
    farmProgress: "農場進度",
    dew: "露珠",
    plots: "田地",
    collection: "收成收藏",
    emptyPlot: "空田地",
    ready: "可收成",
    growing: "成長中",
    emptyCollection: "還沒有收成。",
    legacy: "朋友更新並同步 App 後，這項資料就會顯示。",
    missing: "找不到朋友",
    missingHint: "請回到朋友頁重新整理，或請對方再次加入你的朋友連線。",
    backFriends: "回到朋友",
  },
} as const;

export default function FriendProfilePage() {
  const params = useParams<{ id: string }>();
  return <FriendProfile friendId={params.id} />;
}

export function FriendProfile({ friendId }: { friendId: string }) {
  const router = useRouter();
  const lang = useStore((state) => state.lang);
  const friend = useStore((state) => state.friends[friendId]);
  const shareDailyProgress = useStore((state) => state.shareDailyProgress);
  const [tab, setTab] = useState<FriendTab>("overview");
  const copy = COPY[lang];

  if (!friend) {
    return (
      <main className="page friend-profile-page">
        <button className="chip press icon-label mb-4" onClick={() => router.push("/friends")}>
          <AppIcon name="back" size={16} /> {copy.backFriends}
        </button>
        <GlassCard className="p-6 text-center">
          <div className="empty-icon mx-auto"><AppIcon name="friends" size={30} /></div>
          <div className="t-title mt-2">{copy.missing}</div>
          <div className="t-sub mt-1">{copy.missingHint}</div>
        </GlassCard>
      </main>
    );
  }

  return (
    <main className="page friend-profile-page">
      <header className="friend-profile-topbar">
        <button className="ibtn press" onClick={() => router.push("/friends")} aria-label={copy.backFriends}>
          <AppIcon name="back" size={20} />
        </button>
        <div className="min-w-0">
          <div className="t-section">{copy.profile}</div>
          <div className="font-bold truncate">{friend.name}</div>
        </div>
        <button className="chip chip-on press icon-label friend-detail-share" onClick={() => {
          shareDailyProgress(friend.id);
          void syncNow().then(
            () => toast(lang === "zh" ? `已與 ${friend.name} 分享今日進度` : `Today’s progress shared with ${friend.name}`, "goal"),
            () => toast(lang === "zh" ? "進度已儲存，稍後會再同步" : "Progress saved; sync will retry shortly", "warning")
          );
        }}>
          <AppIcon name="upload" size={14} /> {lang === "zh" ? "分享今日進度" : "Share today"}
        </button>
      </header>

      <FriendHero friend={friend} lang={lang} />

      <Segmented<FriendTab>
        className="friend-profile-tabs mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: copy.overview },
          { value: "meals", label: copy.meals },
          { value: "training", label: copy.training },
          { value: "farm", label: copy.farm },
        ]}
      />

      {tab === "overview" && <OverviewTab friend={friend} lang={lang} />}
      {tab === "meals" && <MealsTab friend={friend} lang={lang} />}
      {tab === "training" && <TrainingTab friend={friend} lang={lang} />}
      {tab === "farm" && <FarmTab friend={friend} lang={lang} />}
    </main>
  );
}

function FriendHero({ friend, lang }: { friend: MemberSnapshot; lang: Lang }) {
  const copy = COPY[lang];
  const levelStartXp = Math.max(0, friend.level - 1) ** 2 * 60;
  const nextLevelXp = friend.level ** 2 * 60;
  const earnedThisLevel = Math.max(0, friend.xp - levelStartXp);
  const neededThisLevel = Math.max(1, nextLevelXp - levelStartXp);
  const levelProgress = Math.min(1, earnedThisLevel / neededThisLevel);
  return (
    <GlassCard strong className="friend-profile-hero">
      <ProfileAvatar
        className="friend-profile-avatar"
        name={friend.name}
        photoDataUrl={friend.photoDataUrl}
        iconSize={34}
        eager
      />
      <div className="min-w-0 flex-1">
        <h1>{friend.name}</h1>
        <div className="friend-level-line">
          <b>{copy.level} {friend.level}</b>
          <span>{friend.xp} XP</span>
        </div>
        <div className="friend-level-track" aria-label={`${Math.round(levelProgress * 100)}% ${copy.nextLevel}`}>
          <span style={{ width: `${levelProgress * 100}%` }} />
        </div>
        <div className="t-cap mt-1">{Math.max(0, neededThisLevel - earnedThisLevel)} XP {copy.nextLevel}</div>
      </div>
      <div className="friend-updated">
        <AppIcon name="refresh" size={13} />
        <span>{copy.updated}<br />{formatUpdated(friend.updatedAt, lang)}</span>
      </div>
    </GlassCard>
  );
}

function OverviewTab({ friend, lang }: { friend: MemberSnapshot; lang: Lang }) {
  const copy = COPY[lang];
  const displayUnit = useActiveProfile().unit;
  const today = friend.today;
  const calProgress = today && today.calGoal > 0 ? today.cal / today.calGoal : 0;
  const proteinProgress = today && today.proteinGoal > 0 ? today.protein / today.proteinGoal : 0;
  const recent = friend.workouts?.recent ?? (friend.lastWorkout ? [friend.lastWorkout] : []);
  const activeTheme = friend.theme ?? "honeydew";
  const health = friend.health?.[0];
  const weightTrend = friend.weightTrend;
  const weightChange = weightTrend
    ? convertWeightUnit(weightTrend.change, weightTrend.unit, displayUnit)
    : undefined;
  const earnedBadgeIds = new Set(friend.badges ?? []);
  const badges = GARDEN_ACHIEVEMENT_DEFINITIONS.filter((badge) => earnedBadgeIds.has(badge.id));
  const dailyProgress = friend.dailyProgress;

  return (
    <div className="a-fadeUp">
      <div className="friend-stat-grid mb-4">
        <MiniStat icon="fire" label={copy.streak} value={friend.streak} />
        <MiniStat icon="trophy" label={copy.best} value={friend.best} />
        <MiniStat icon="fruit" label={copy.harvests} value={friend.farm ? friend.farm.totalHarvests : "—"} />
        <MiniStat icon="gym" label={copy.workouts} value={friend.workouts ? friend.workouts.completed : friend.lastWorkout ? 1 : "—"} />
      </div>

      <div className="friend-social-showcase mb-4">
        <GlassCard className="friend-theme-card">
          <span className={`theme-fruit theme-fruit-${activeTheme}`} aria-hidden="true" />
          <div className="min-w-0">
            <small>{copy.activeTheme}</small>
            <b>{themeName(activeTheme, lang)}</b>
            <span className="friend-theme-swatches" aria-hidden="true">
              {THEME_VISUALS[activeTheme].colors.map((color) => <i key={color} style={{ background: color }} />)}
            </span>
          </div>
        </GlassCard>
        <GlassCard className="friend-badge-summary">
          <AppIcon name="medal" size={25} />
          <div><small>{copy.badges}</small><b>{friend.badges ? badges.length : "—"}</b></div>
        </GlassCard>
      </div>

      {dailyProgress && <>
        <SectionTitle icon="goal" text={lang === "zh" ? "分享的每日進度" : "Shared daily progress"} />
        <GlassCard className="friend-daily-progress mb-4">
          <div className="friend-daily-progress-head">
            <div><b>{fmtDate(dailyProgress.date, lang)}</b><small>{lang === "zh" ? "每日摘要" : "Daily snapshot"}</small></div>
            <span className="chip icon-label"><AppIcon name="refresh" size={13} />{formatUpdated(dailyProgress.sharedAt, lang)}</span>
          </div>
          <div className="friend-daily-progress-grid">
            <MiniStat icon="goal" label={copy.calories} value={`${fmtNum(dailyProgress.calories)} / ${fmtNum(dailyProgress.calorieGoal)}`} />
            <MiniStat icon="cutlery" label={copy.protein} value={`${fmtNum(dailyProgress.protein)}g`} />
            <MiniStat icon="water" label={lang === "zh" ? "飲水" : "Water"} value={`${dailyProgress.waterCups} / ${dailyProgress.waterGoal}`} />
            <MiniStat icon="gym" label={copy.workouts} value={dailyProgress.workouts} />
            <MiniStat icon="heart" label={copy.steps} value={fmtNum(dailyProgress.steps)} />
            <MiniStat icon="fire" label={copy.streak} value={dailyProgress.streak} />
          </div>
        </GlassCard>
      </>}

      {weightTrend && weightChange !== undefined && <>
        <SectionTitle icon="weight" text={copy.weightTrend} />
        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="icon-tile"><AppIcon name="weight" size={20} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-bold">
                {weightChange > 0
                  ? `${copy.weightGained} ${fmt1(Math.abs(weightChange))} ${displayUnit}`
                  : weightChange < 0
                    ? `${copy.weightLost} ${fmt1(Math.abs(weightChange))} ${displayUnit}`
                    : copy.weightUnchanged}
              </div>
              <div className="t-cap">
                {lang === "zh" ? `過去 ${weightTrend.days} 天 · 截至 ${fmtDate(weightTrend.asOf, lang)}` : `Over the past ${weightTrend.days} days · through ${fmtDate(weightTrend.asOf, lang)}`}
              </div>
            </div>
          </div>
          <div className="t-cap icon-label mt-3"><AppIcon name="lock" size={13} /> {copy.actualWeightPrivate}</div>
        </GlassCard>
      </>}

      {friend.health !== undefined && <>
        <SectionTitle icon="heart" text={copy.appleHealth} />
        {health ? (
        <>
          <div className="friend-health-grid mb-3">
            <MiniStat icon="heart" label={copy.steps} value={fmtNum(health.steps)} />
            <MiniStat icon="timer" label={copy.stand} value={fmtNum(health.standMinutes)} />
            <MiniStat icon="gym" label={copy.healthWorkouts} value={health.workouts?.length ?? 0} />
          </div>
          <GlassCard className="friend-health-history mb-4">
            {(friend.health ?? []).map((day) => (
              <div key={day.date}>
                <span><b>{fmtDate(day.date, lang)}</b><small>{fmtNum(day.steps)} {copy.steps.toLocaleLowerCase()}</small></span>
                <span><b>{fmtNum(day.standMinutes)} min</b><small>{day.workouts?.length ?? 0} {copy.healthWorkouts.toLocaleLowerCase()}</small></span>
              </div>
            ))}
          </GlassCard>
        </>
        ) : <GlassCard className="friend-empty-copy mb-4">{copy.noHealth}</GlassCard>}
      </>}

      {friend.badges !== undefined && <>
        <SectionTitle icon="medal" text={copy.badges} />
        {badges.length ? (
        <div className="friend-badge-grid mb-4">
          {badges.map((badge) => (
            <GlassCard className={`friend-badge-card tone-${badge.tone}`} key={badge.id}>
              <span><AppIcon name={badge.icon} size={21} /></span>
              <b>{badge.name[lang]}</b>
              <small>{badge.description[lang]}</small>
            </GlassCard>
          ))}
        </div>
        ) : <GlassCard className="friend-empty-copy mb-4">{copy.noBadges}</GlassCard>}
      </>}

      {today && <>
        <SectionTitle icon="goal" text={copy.today} />
        <GlassCard className="p-4 mb-4">
          <ProgressMetric label={copy.calories} value={today.cal} goal={today.calGoal} progress={calProgress} color="linear-gradient(90deg,var(--cal-from),var(--cal-to))" unit="cal" />
          <div className="divider my-3" />
          <ProgressMetric label={copy.protein} value={today.protein} goal={today.proteinGoal} progress={proteinProgress} color="var(--protein)" unit="g" />
        </GlassCard>
      </>}

      {friend.garden && <>
        <SectionTitle icon="chart" text={copy.consistency} />
        <GlassCard className="friend-consistency mb-4">
          {friend.garden.map((day) => (
          <div key={day.date} className={day.hit ? "is-hit" : ""}>
            <span>{day.hit && <AppIcon name="leaf" size={15} />}</span>
            <small>{shortDay(day.date, lang)}</small>
          </div>
          ))}
        </GlassCard>
      </>}

      {(friend.workouts !== undefined || friend.lastWorkout) && <>
        <SectionTitle icon="gym" text={copy.recentTraining} />
        <GlassCard className="px-4 py-1">
        {recent.length ? recent.map((workout, index) => (
          <div className="row" key={`${workout.date}-${index}`}>
            <span className="icon-tile friend-row-icon"><AppIcon name="gym" size={18} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{workout.name[lang]}</div>
              <div className="t-cap">{fmtDate(workout.date, lang)}</div>
            </div>
            <div className="t-cap tabular text-right">
              {fmtNum(friend.workouts
                ? convertWeightUnit(workout.volume, friend.workouts.unit, displayUnit)
                : workout.volume)} {friend.workouts ? displayUnit : ""}·{copy.sets === "sets" ? "reps" : "下"}
              {workout.prs > 0 && <span className="icon-label justify-end"><AppIcon name="medal" size={13} /> {workout.prs}</span>}
            </div>
          </div>
        )) : <div className="friend-empty-copy">{copy.noRecentTraining}</div>}
        </GlassCard>
      </>}
    </div>
  );
}

function MealsTab({ friend, lang }: { friend: MemberSnapshot; lang: Lang }) {
  const copy = COPY[lang];
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const importFriendMealPlan = useStore((state) => state.importFriendMealPlan);
  const mealPlan = friend.mealPlan;
  const recipes = useMemo(() => new Map((mealPlan?.recipes ?? []).map((recipe) => [recipe.id, recipe])), [mealPlan]);
  const plannedDays = (mealPlan?.days ?? []).filter(({ plan }) => MEAL_SLOTS.some((slot) => (plan[slot]?.length ?? 0) > 0));
  const sharedRecipes = friend.sharedRecipes ?? [];
  const foodLogs = friend.foodLogs ?? [];
  const foodLogsShared = friend.foodLogs !== undefined;

  if (!mealPlan && sharedRecipes.length === 0 && !foodLogsShared) {
    return <LegacyEmpty icon="kitchen" text={friend.version === 3 || friend.version === 9 ? copy.noSharedMeals : copy.legacy} />;
  }

  const importPlan = (mode: "merge" | "replace") => {
    if (!mealPlan) return;
    const result = importFriendMealPlan(friend.id, mealPlan, mode);
    toast(`${result.meals} ${result.meals === 1 ? copy.planAddedOne : copy.planAddedMany}`, "calendar");
    setImportOpen(false);
  };

  return (
    <div className="a-fadeUp">
      {foodLogsShared && <>
        <SectionTitle icon="cutlery" text={copy.recentFoods} />
        {foodLogs.length ? (
        <GlassCard className="friend-food-log mb-5">
          {foodLogs.map((entry, index) => (
            <Fragment key={entry.id}>
              {(index === 0 || foodLogs[index - 1].date !== entry.date) && (
                <div className="friend-food-log-day">{fmtDate(entry.date, lang)}</div>
              )}
              <div className="friend-food-log-row">
                <span><AppIcon name={iconFromLegacy(entry.emoji, "cutlery")} size={18} /></span>
                <div className="min-w-0">
                  <b>{entry.name[lang] || entry.name.en}</b>
                  <small>{friendFoodAmount(entry, lang)} · {mealName(entry.meal, lang)}</small>
                </div>
                <strong>{fmtNum(entry.macros.cal)} cal</strong>
              </div>
            </Fragment>
          ))}
        </GlassCard>
        ) : <GlassCard className="friend-empty-copy mb-5">{copy.noFoodLogs}</GlassCard>}
      </>}

      {mealPlan && (
        <>
          <div className="friend-plan-heading">
            <SectionTitle icon="calendar" text={copy.mealPlan} />
            {plannedDays.length > 0 && (
              <button className="chip chip-on press icon-label" onClick={() => setImportOpen(true)}>
                <AppIcon name="copy" size={14} /> {copy.addMealPlan}
              </button>
            )}
          </div>
          {plannedDays.length ? (
            <div className="flex flex-col gap-3">
              {plannedDays.map(({ date, plan }) => {
                const dayCalories = MEAL_SLOTS.reduce((total, slot) => total + (plan[slot] ?? []).reduce((sum, meal) => sum + (recipes.get(meal.recipeId)?.perServing.cal ?? 0) * meal.servings, 0), 0);
                return (
                  <GlassCard className="friend-plan-day" key={date}>
                    <div className="friend-plan-day-head">
                      <div>
                        <b>{fmtDate(date, lang)}</b>
                        <small>{new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</small>
                      </div>
                      <span className="chip">{fmtNum(dayCalories)} cal</span>
                    </div>
                    <div className="friend-meal-list">
                      {MEAL_SLOTS.flatMap((slot) => (plan[slot] ?? []).map((meal, index) => {
                        const recipe = recipes.get(meal.recipeId);
                        if (!recipe) return [];
                        return [
                          <button className="friend-meal-row press" key={`${slot}-${index}`} onClick={() => setSelected(recipe)}>
                            <span className="friend-meal-slot"><MealGlyph meal={slot} size={17} /></span>
                            <FoodGlyph category={recipe.cat} size={17} compact />
                            <span className="min-w-0 flex-1">
                              <b>{recipe.name[lang]}</b>
                              <small>{meal.servings} {meal.servings === 1 ? copy.serving : copy.servings} · {fmtNum(recipe.perServing.cal * meal.servings)} cal</small>
                            </span>
                            <AppIcon name="next" size={16} />
                          </button>,
                        ];
                      }))}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : <GlassCard className="friend-empty-copy mb-4">{copy.noMeals}</GlassCard>}
        </>
      )}

      {sharedRecipes.length > 0 && (
        <div className={mealPlan ? "mt-5" : ""}>
          <SectionTitle icon="kitchen" text={copy.sharedRecipes} />
          <div className="friend-shared-recipe-grid">
            {sharedRecipes.map((recipe) => (
              <button className="friend-shared-recipe press" key={recipe.id} onClick={() => setSelected(recipe)}>
                <FoodGlyph category={recipe.cat} size={18} compact />
                <span className="min-w-0 flex-1">
                  <b>{recipe.name[lang]}</b>
                  <small>{fmtNum(recipe.perServing.cal)} cal · {recipe.minutes} min</small>
                </span>
                <AppIcon name="next" size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      <RecipeSheet recipe={selected} friendId={friend.id} lang={lang} onClose={() => setSelected(null)} />
      <Sheet open={importOpen} onClose={() => setImportOpen(false)} title={<span className="icon-label"><AppIcon name="calendar" size={19} /> {copy.addMealPlanTitle}</span>}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="t-sub">{copy.addMealPlanHint}</p>
          <button className="btn btn-primary press" onClick={() => importPlan("merge")}><AppIcon name="plus" size={17} /> {copy.mergePlan}</button>
          <button className="btn press" onClick={() => importPlan("replace")}><AppIcon name="copy" size={17} /> {copy.replacePlan}</button>
        </div>
      </Sheet>
    </div>
  );
}

function TrainingTab({ friend, lang }: { friend: MemberSnapshot; lang: Lang }) {
  const copy = COPY[lang];
  const displayUnit = useActiveProfile().unit;
  const [weekIndex, setWeekIndex] = useState(0);
  const importFriendWorkoutPlan = useStore((state) => state.importFriendWorkoutPlan);
  const snapshot = friend.workoutPlan;
  const progress = friend.workouts;

  if (!snapshot && !progress) {
    return <LegacyEmpty icon="gym" text={friend.version === 9 ? copy.noSharedTraining : friend.version === 2 || friend.version === 3 ? copy.noWorkoutPlan : copy.legacy} />;
  }
  const plan = snapshot?.plan;
  const week = plan?.weeks[Math.min(weekIndex, Math.max(0, plan.weeks.length - 1))];

  return (
    <div className="a-fadeUp">
      {progress && (
        <div className="friend-stat-grid friend-stat-grid-three mb-4">
          <MiniStat icon="checkCircle" label={copy.completed} value={progress.completed} />
          <MiniStat icon="medal" label={copy.prs} value={progress.totalPrs} />
          <MiniStat icon="weight" label={copy.volume} value={`${fmtNum(convertWeightUnit(progress.totalVolume, progress.unit, displayUnit))} ${displayUnit}·${lang === "zh" ? "下" : "reps"}`} />
        </div>
      )}

      {snapshot && plan && <>
        <SectionTitle icon="gym" text={copy.activePlan} />
        <GlassCard strong className="friend-workout-plan-head mb-3">
          <div className="icon-tile"><AppIcon name="gym" size={21} /></div>
          <div className="min-w-0 flex-1">
            <h2>{plan.name[lang]}</h2>
            <div className="t-cap">{plan.weeks.length} {lang === "zh" ? "週" : plan.weeks.length === 1 ? "week" : "weeks"} · {plan.weeks[0]?.days.length ?? 0} {lang === "zh" ? "天／週" : "days/week"}</div>
          </div>
        </GlassCard>
        <button
          className="btn btn-primary press w-full mb-3"
          onClick={() => {
            importFriendWorkoutPlan(friend.id, plan, snapshot.unit);
            toast(copy.workoutPlanSaved, "gym");
          }}
        >
          <AppIcon name="copy" size={17} /> {copy.useWorkoutPlan}
        </button>

        {plan.weeks.length > 1 && (
          <div className="flex gap-2 mb-3 overflow-x-auto hide-scroll pb-1">
            {plan.weeks.map((_, index) => (
              <button key={index} className={`chip press ${weekIndex === index ? "chip-on" : ""}`} onClick={() => setWeekIndex(index)}>
                {lang === "zh" ? `${copy.week} ${index + 1} 週` : `${copy.week} ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {week?.days.map((day, dayIndex) => (
            <GlassCard className="friend-workout-day" key={`${day.id}-${dayIndex}`}>
              <div className="friend-workout-day-title"><span>{dayIndex + 1}</span><b>{day.name[lang]}</b></div>
              {day.exercises.map((exercise, exerciseIndex) => {
                const targetWeight = exercise.targetWeight != null
                  ? convertWeightUnit(exercise.targetWeight, snapshot.unit, displayUnit)
                  : seedWeightInUnit(exercise.seedWeight, displayUnit);
                return (
                  <div className="friend-exercise-row" key={`${exercise.id}-${exerciseIndex}`}>
                    <div className="min-w-0 flex-1">
                      <b>{exercise.name[lang]}</b>
                      {exercise.cue?.[lang] && <small>{exercise.cue[lang]}</small>}
                    </div>
                    <span className="tabular">
                      {exercise.sets} {copy.sets} × {exercise.reps}
                      {targetWeight != null ? <small>{fmt1(targetWeight)} {displayUnit}</small> : null}
                    </span>
                  </div>
                );
              })}
            </GlassCard>
          ))}
        </div>
      </>}
    </div>
  );
}

function FarmTab({ friend, lang }: { friend: MemberSnapshot; lang: Lang }) {
  const copy = COPY[lang];
  const farm = friend.farm;
  const now = Date.now();
  if (!farm) return <LegacyEmpty icon="soil" text={friend.version === 9 ? copy.noSharedFarm : copy.legacy} />;
  const harvests = Object.entries(farm.harvests).filter(([, count]) => (count ?? 0) > 0);

  return (
    <div className="a-fadeUp">
      <SectionTitle icon="soil" text={copy.farmProgress} />
      <div className="friend-stat-grid friend-stat-grid-three mb-3">
        <MiniStat icon="water" label={copy.dew} value={farm.dew} />
        <MiniStat icon="soil" label={copy.plots} value={farm.unlockedPlots} />
        <MiniStat icon="fruit" label={copy.harvests} value={farm.totalHarvests} />
      </div>

      <GlassCard strong className="friend-farm-board mb-4">
        <div className="friend-farm-sky"><span /><span /></div>
        <div className="friend-farm-grid">
          {farm.plots.slice(0, farm.unlockedPlots).map((plot) => {
            if (!plot.variety) {
              return <div className="friend-farm-plot is-empty" key={plot.id}><AppIcon name="soil" size={23} /><small>{copy.emptyPlot}</small></div>;
            }
            const variety = varietyById(plot.variety);
            const progress = cropProgress(plot, now);
            const image = cropStageImage(variety, cropVisualStage(plot, now));
            return (
              <div className={`friend-farm-plot ${progress >= 1 ? "is-ready" : ""}`} key={plot.id}>
                <span className="friend-crop-art"><Image src={image} alt="" fill sizes="72px" /></span>
                <b>{variety.name[lang]}</b>
                <small>{progress >= 1 ? copy.ready : `${copy.growing} · ${Math.round(progress * 100)}%`}</small>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <SectionTitle icon="package" text={copy.collection} />
      <GlassCard className="friend-harvest-collection">
        {harvests.length ? harvests.map(([id, count]) => {
          const variety = varietyById(id as Parameters<typeof varietyById>[0]);
          return (
            <div key={id}>
              <span><Image src={variety.image} alt="" fill sizes="58px" /></span>
              <b>{count}</b>
              <small>{variety.name[lang]}</small>
            </div>
          );
        }) : <div className="friend-empty-copy">{copy.emptyCollection}</div>}
      </GlassCard>
    </div>
  );
}

function RecipeSheet({ recipe, friendId, lang, onClose }: { recipe: Recipe | null; friendId: string; lang: Lang; onClose: () => void }) {
  const copy = COPY[lang];
  const importFriendRecipe = useStore((state) => state.importFriendRecipe);
  if (!recipe) return null;
  return (
    <Sheet open onClose={onClose} title={<span className="icon-label"><FoodGlyph category={recipe.cat} size={18} compact /> {recipe.name[lang]}</span>}>
      <div className="friend-recipe-macros">
        <div><b>{fmtNum(recipe.perServing.cal)}</b><small>cal</small></div>
        <div><b>{recipe.perServing.protein}g</b><small>{copy.protein}</small></div>
        <div><b>{recipe.minutes}</b><small>min</small></div>
      </div>
      <div className="t-cap mb-3">{copy.perServing}</div>
      <div className="t-section mb-2">{copy.ingredients}</div>
      <GlassCard className="px-4 py-1 mb-4">
        {recipe.ingredients.map((ingredient, index) => (
          <div className="row" key={`${ingredient.name.en}-${index}`}>
            <span className="flex-1 font-semibold">{ingredient.name[lang]}</span>
            <span className="t-sub">{ingredient.amount[lang]}</span>
          </div>
        ))}
      </GlassCard>
      {recipe.steps?.length ? (
        <>
          <div className="t-section mb-2">{copy.method}</div>
          <ol className="recipe-steps glass glass-sm">
            {recipe.steps.map((step, index) => <li key={index}>{step[lang]}</li>)}
          </ol>
        </>
      ) : null}
      <button
        className="btn btn-primary press w-full mt-4"
        onClick={() => {
          importFriendRecipe(friendId, recipe);
          toast(copy.recipeSaved, "save");
        }}
      >
        <AppIcon name="save" size={17} /> {copy.saveRecipe}
      </button>
    </Sheet>
  );
}

function SectionTitle({ icon, text }: { icon: Parameters<typeof AppIcon>[0]["name"]; text: string }) {
  return <div className="t-section icon-label mb-2"><AppIcon name={icon} size={16} /> {text}</div>;
}

function MiniStat({ icon, label, value }: { icon: Parameters<typeof AppIcon>[0]["name"]; label: string; value: string | number }) {
  return (
    <GlassCard className="friend-mini-stat">
      <AppIcon name={icon} size={18} />
      <b className="tabular">{value}</b>
      <small>{label}</small>
    </GlassCard>
  );
}

function ProgressMetric({ label, value, goal, progress, color, unit }: { label: string; value: number; goal: number; progress: number; color: string; unit: string }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-2">
        <b>{label}</b>
        <span className="t-cap tabular"><b>{Math.round(value)}</b> / {goal} {unit}</span>
      </div>
      <div className="friend-metric-track"><span style={{ width: `${Math.min(1, progress) * 100}%`, background: color }} /></div>
    </div>
  );
}

function LegacyEmpty({ icon, text }: { icon: Parameters<typeof AppIcon>[0]["name"]; text: string }) {
  return (
    <GlassCard className="friend-detail-empty">
      <div className="empty-icon"><AppIcon name={icon} size={29} /></div>
      <div className="t-sub">{text}</div>
    </GlassCard>
  );
}

function shortDay(date: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function themeName(theme: ThemeId, lang: Lang): string {
  const names: Record<ThemeId, { en: string; zh: string }> = {
    honeydew: { en: "Honeydew", zh: "蜜瓜" },
    watermelon: { en: "Watermelon", zh: "西瓜" },
    cantaloupe: { en: "Cantaloupe", zh: "香瓜" },
    canary: { en: "Canary", zh: "黃金瓜" },
    hami: { en: "Hami", zh: "哈密瓜" },
    chamoe: { en: "Korean Chamoe", zh: "韓國香瓜" },
    "moon-gold": { en: "Moon Gold", zh: "月金瓜" },
    densuke: { en: "Densuke Obsidian", zh: "田助黑曜" },
  };
  return names[theme][lang];
}

function mealName(meal: MealSlot, lang: Lang): string {
  const names: Record<MealSlot, { en: string; zh: string }> = {
    breakfast: { en: "Breakfast", zh: "早餐" },
    lunch: { en: "Lunch", zh: "午餐" },
    dinner: { en: "Dinner", zh: "晚餐" },
    snack: { en: "Snack", zh: "點心" },
  };
  return names[meal][lang];
}

function friendFoodAmount(entry: LogEntry, lang: Lang): string {
  if (entry.amount != null && entry.amountUnit) {
    const units = {
      serving: lang === "zh" ? "份" : entry.amount === 1 ? "serving" : "servings",
      g: "g",
      ml: "ml",
      oz: "oz",
      fl_oz: "fl oz",
      cup: lang === "zh" ? "杯" : entry.amount === 1 ? "cup" : "cups",
      scoop: lang === "zh" ? "勺" : entry.amount === 1 ? "scoop" : "scoops",
      piece: lang === "zh" ? "個" : entry.amount === 1 ? "piece" : "pieces",
    } as const;
    return `${fmtNum(entry.amount)} ${units[entry.amountUnit]}`;
  }
  if (entry.grams != null) return `${fmtNum(entry.grams)} g`;
  return lang === "zh" ? "1 份" : "1 serving";
}

function formatUpdated(timestamp: number, lang: Lang) {
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return lang === "zh" ? "剛剛" : "just now";
  if (elapsedMinutes < 60) return lang === "zh" ? `${elapsedMinutes} 分鐘前` : `${elapsedMinutes}m ago`;
  const hours = Math.round(elapsedMinutes / 60);
  if (hours < 24) return lang === "zh" ? `${hours} 小時前` : `${hours}h ago`;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", { month: "short", day: "numeric" }).format(timestamp);
}
