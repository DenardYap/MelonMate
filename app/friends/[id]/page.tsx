"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppIcon, FoodGlyph, MealGlyph } from "@/components/icons";
import { GlassCard, Segmented, Sheet, toast } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { cropProgress, cropStageImage, cropVisualStage, varietyById } from "@/lib/garden";
import { fmtNum } from "@/lib/nutrition";
import { useStore } from "@/lib/store";
import type { Lang, MealSlot, MemberSnapshot, Recipe } from "@/lib/types";

type FriendTab = "overview" | "meals" | "training" | "farm";
const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

const COPY = {
  en: {
    profile: "Friend profile",
    overview: "Overview",
    meals: "Meals",
    training: "Training",
    farm: "Farm",
    sharedView: "Shared view",
    updated: "Updated",
    level: "Level",
    nextLevel: "to next level",
    streak: "Day streak",
    best: "Best streak",
    harvests: "Harvests",
    workouts: "Workouts",
    today: "Today",
    calories: "Calories",
    protein: "Protein",
    consistency: "Last seven days",
    recentTraining: "Recent training",
    noRecentTraining: "No completed workouts shared yet.",
    mealPlan: "Upcoming meal plan",
    noMeals: "No meals are planned for the next seven days.",
    noSharedMeals: "No meal plan or recipes are being shared right now.",
    sharedRecipes: "Recipes shared with you",
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
    noWorkoutPlan: "No active workout plan is shared yet.",
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
    privateNote: "Only items your friend chose to share can be copied. Their food logs, set-by-set workout history, weight, and water remain private.",
  },
  zh: {
    profile: "朋友檔案",
    overview: "總覽",
    meals: "餐點",
    training: "訓練",
    farm: "農場",
    sharedView: "分享內容",
    updated: "更新於",
    level: "等級",
    nextLevel: "升級所需",
    streak: "連續天數",
    best: "最佳連勝",
    harvests: "收成",
    workouts: "訓練次數",
    today: "今天",
    calories: "熱量",
    protein: "蛋白質",
    consistency: "近七天",
    recentTraining: "最近訓練",
    noRecentTraining: "尚未分享已完成的訓練。",
    mealPlan: "未來餐點計畫",
    noMeals: "未來七天尚未安排餐點。",
    noSharedMeals: "目前沒有分享餐點計畫或食譜。",
    sharedRecipes: "分享給你的食譜",
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
    noWorkoutPlan: "尚未分享目前的訓練計畫。",
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
    missingHint: "請回到朋友頁重新整理，或請對方再次加入朋友圈。",
    backFriends: "回到朋友",
    privateNote: "你只能複製朋友選擇分享的內容。對方的飲食明細、每組訓練記錄、體重與飲水仍保持私人。",
  },
} as const;

export default function FriendProfilePage() {
  const params = useParams<{ id: string }>();
  return <FriendProfile friendId={params.id} />;
}

function FriendProfile({ friendId }: { friendId: string }) {
  const router = useRouter();
  const lang = useStore((state) => state.lang);
  const friend = useStore((state) => state.friends[friendId]);
  const [tab, setTab] = useState<FriendTab>("overview");
  const copy = COPY[lang];

  if (!friend) {
    return (
      <main className="page friend-profile-page">
        <button className="chip press icon-label mb-4" onClick={() => router.push("/me")}>
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
        <button className="ibtn press" onClick={() => router.push("/me")} aria-label={copy.backFriends}>
          <AppIcon name="back" size={20} />
        </button>
        <div className="min-w-0">
          <div className="t-section">{copy.profile}</div>
          <div className="font-bold truncate">{friend.name}</div>
        </div>
        <span className="chip icon-label friend-readonly"><AppIcon name="friends" size={13} /> {copy.sharedView}</span>
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

      <div className="friend-private-note icon-label">
        <AppIcon name="lock" size={15} />
        <span>{copy.privateNote}</span>
      </div>
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
      <div className="friend-profile-avatar"><AppIcon name="user" size={34} /></div>
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
  const calProgress = friend.today.calGoal > 0 ? friend.today.cal / friend.today.calGoal : 0;
  const proteinProgress = friend.today.proteinGoal > 0 ? friend.today.protein / friend.today.proteinGoal : 0;
  const recent = friend.workouts?.recent ?? (friend.lastWorkout ? [friend.lastWorkout] : []);

  return (
    <div className="a-fadeUp">
      <div className="friend-stat-grid mb-4">
        <MiniStat icon="fire" label={copy.streak} value={friend.streak} />
        <MiniStat icon="trophy" label={copy.best} value={friend.best} />
        <MiniStat icon="fruit" label={copy.harvests} value={friend.farm?.totalHarvests ?? friend.melons} />
        <MiniStat icon="gym" label={copy.workouts} value={friend.workouts?.completed ?? (friend.lastWorkout ? 1 : 0)} />
      </div>

      <SectionTitle icon="goal" text={copy.today} />
      <GlassCard className="p-4 mb-4">
        <ProgressMetric label={copy.calories} value={friend.today.cal} goal={friend.today.calGoal} progress={calProgress} color="linear-gradient(90deg,var(--cal-from),var(--cal-to))" unit="cal" />
        <div className="divider my-3" />
        <ProgressMetric label={copy.protein} value={friend.today.protein} goal={friend.today.proteinGoal} progress={proteinProgress} color="var(--protein)" unit="g" />
      </GlassCard>

      <SectionTitle icon="chart" text={copy.consistency} />
      <GlassCard className="friend-consistency mb-4">
        {friend.garden.map((day) => (
          <div key={day.date} className={day.hit ? "is-hit" : ""}>
            <span>{day.hit && <AppIcon name="leaf" size={15} />}</span>
            <small>{shortDay(day.date, lang)}</small>
          </div>
        ))}
      </GlassCard>

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
              {fmtNum(workout.volume)} {friend.workouts?.unit ?? ""}
              {workout.prs > 0 && <span className="icon-label justify-end"><AppIcon name="medal" size={13} /> {workout.prs}</span>}
            </div>
          </div>
        )) : <div className="friend-empty-copy">{copy.noRecentTraining}</div>}
      </GlassCard>
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

  if (!mealPlan && sharedRecipes.length === 0) {
    return <LegacyEmpty icon="kitchen" text={friend.version === 3 ? copy.noSharedMeals : copy.legacy} />;
  }

  const importPlan = (mode: "merge" | "replace") => {
    if (!mealPlan) return;
    const result = importFriendMealPlan(friend.id, mealPlan, mode);
    toast(`${result.meals} ${result.meals === 1 ? copy.planAddedOne : copy.planAddedMany}`, "calendar");
    setImportOpen(false);
  };

  return (
    <div className="a-fadeUp">
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
  const [weekIndex, setWeekIndex] = useState(0);
  const importFriendWorkoutPlan = useStore((state) => state.importFriendWorkoutPlan);
  const snapshot = friend.workoutPlan;
  const progress = friend.workouts;

  if (!snapshot) return <LegacyEmpty icon="gym" text={friend.version === 2 || friend.version === 3 ? copy.noWorkoutPlan : copy.legacy} />;
  const plan = snapshot.plan;
  const week = plan.weeks[Math.min(weekIndex, Math.max(0, plan.weeks.length - 1))];

  return (
    <div className="a-fadeUp">
      {progress && (
        <div className="friend-stat-grid friend-stat-grid-three mb-4">
          <MiniStat icon="checkCircle" label={copy.completed} value={progress.completed} />
          <MiniStat icon="medal" label={copy.prs} value={progress.totalPrs} />
          <MiniStat icon="weight" label={copy.volume} value={fmtNum(progress.totalVolume)} />
        </div>
      )}

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
          importFriendWorkoutPlan(friend.id, plan);
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
              const targetWeight = exercise.targetWeight ?? exercise.seedWeight;
              return (
                <div className="friend-exercise-row" key={`${exercise.id}-${exerciseIndex}`}>
                  <div className="min-w-0 flex-1">
                    <b>{exercise.name[lang]}</b>
                    {exercise.cue?.[lang] && <small>{exercise.cue[lang]}</small>}
                  </div>
                  <span className="tabular">
                    {exercise.sets} {copy.sets} × {exercise.reps}
                    {targetWeight != null ? <small>{targetWeight} {snapshot.unit}</small> : null}
                  </span>
                </div>
              );
            })}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function FarmTab({ friend, lang }: { friend: MemberSnapshot; lang: Lang }) {
  const copy = COPY[lang];
  const farm = friend.farm;
  const now = Date.now();
  if (!farm) return <LegacyEmpty icon="soil" text={copy.legacy} />;
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

function formatUpdated(timestamp: number, lang: Lang) {
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return lang === "zh" ? "剛剛" : "just now";
  if (elapsedMinutes < 60) return lang === "zh" ? `${elapsedMinutes} 分鐘前` : `${elapsedMinutes}m ago`;
  const hours = Math.round(elapsedMinutes / 60);
  if (hours < 24) return lang === "zh" ? `${hours} 小時前` : `${hours}h ago`;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", { month: "short", day: "numeric" }).format(timestamp);
}
