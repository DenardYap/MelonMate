"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useActiveProfile, useStore, newId } from "@/lib/store";
import { CAT_LABEL, CAT_ORDER, MEAL_ORDER, translate, type DictKey } from "@/lib/i18n";
import { addDays, fmtDate, todayStr, weekDates, weekdayLabel } from "@/lib/dates";
import { fmtNum, mulMacros } from "@/lib/nutrition";
import { defaultMealByTime } from "@/lib/voice";
import { DecimalInput, EmptyState, GlassCard, Segmented, Sheet, Stepper, toast } from "@/components/ui";
import { AppIcon, FoodGlyph, MealGlyph, SavedFoodGlyph, SELECTABLE_ICONS } from "@/components/icons";
import type { GroceryItem, Ingredient, MealSlot, Recipe, RecipeCat } from "@/lib/types";
import { recommendRecipes, selectedRecipesForProfile } from "@/lib/onboarding";
import { mealPlanMealCount, type MealPlanApplyMode } from "@/lib/mealPlans";
import { filterRecipes, paginateRecipes } from "@/lib/recipeDiscovery";
import { restrictionsFromProfile } from "@/lib/ingredientRestrictions";
import { IngredientRestrictionEditor } from "@/components/IngredientRestrictionEditor";
import { caloriesFromMacros, nutritionBasis, nutritionUnitLabel } from "@/lib/customRecipes";

type Tab = "recipes" | "planner" | "groceries" | "shared";

export default function KitchenPage() {
  const lang = useStore((s) => s.lang);
  const t = (k: DictKey) => translate(k, lang);
  const [tab, setTab] = useState<Tab>("recipes");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "shared") setTab("shared");
  }, []);

  return (
    <main className="page">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="t-hero icon-label"><AppIcon name="kitchen" size={27} /> {t("kitchen")}</h1>
          <div className="t-cap mt-1">{lang === "zh" ? "建立自己的食譜與每份營養" : "Build your recipes and set the nutrition per serving"}</div>
        </div>
      </header>
      <Segmented<Tab>
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "recipes", label: t("recipes") },
          { value: "planner", label: lang === "zh" ? "餐點計畫" : "Meal plan" },
          { value: "groceries", label: lang === "zh" ? "食材" : "Ingredients" },
          { value: "shared", label: lang === "zh" ? "朋友" : "Friends" },
        ]}
      />
      {tab === "recipes" && <RecipesTab />}
      {tab === "planner" && <PlannerTab onBuiltList={() => setTab("groceries")} />}
      {tab === "groceries" && <GroceriesTab />}
      {tab === "shared" && <SharedRecipesTab />}
    </main>
  );
}

function SharedRecipesTab() {
  const lang = useStore((state) => state.lang);
  const friendsById = useStore((state) => state.friends);
  const importFriendRecipe = useStore((state) => state.importFriendRecipe);
  const markRead = useStore((state) => state.markFriendNotificationsRead);
  const [selected, setSelected] = useState<{ friendId: string; friendName: string; recipe: Recipe } | null>(null);
  const [focusFriendId, setFocusFriendId] = useState("");

  useEffect(() => {
    setFocusFriendId(new URLSearchParams(window.location.search).get("friend") ?? "");
    markRead("recipe");
  }, [markRead]);

  const shared = useMemo(() => Object.values(friendsById)
    .flatMap((friend) => (friend.sharedRecipes ?? []).map((recipe) => ({
      friendId: friend.id,
      friendName: friend.name,
      friendEmoji: friend.emoji,
      recipe,
    })))
    .sort((left, right) => Number(right.friendId === focusFriendId) - Number(left.friendId === focusFriendId)),
  [focusFriendId, friendsById]);

  const save = (friendId: string, recipe: Recipe) => {
    importFriendRecipe(friendId, recipe);
    toast(lang === "zh" ? "已儲存可編輯的食譜副本" : "Saved an editable recipe copy", "save");
  };

  return (
    <div className="a-fadeUp">
      <div className="mb-3">
        <div className="t-section icon-label"><AppIcon name="friends" size={18} />{lang === "zh" ? "朋友的食譜" : "Friends’ recipes"}</div>
        <div className="t-cap mt-1">{lang === "zh" ? "朋友儲存的食譜會自動顯示在這裡。" : "Recipes saved by your friends appear here automatically."}</div>
      </div>
      {shared.length ? (
        <div className="grid grid-cols-2 gap-3">
          {shared.map((item) => (
            <GlassCard
              key={`${item.friendId}-${item.recipe.id}`}
              className={item.friendId === focusFriendId ? "recipe-card shared-friend-highlight" : "recipe-card"}
              onClick={() => setSelected({ friendId: item.friendId, friendName: item.friendName, recipe: item.recipe })}
            >
              <div className="flex items-center justify-between gap-2">
                <SavedFoodGlyph icon={item.recipe.custom ? item.recipe.emoji : undefined} category={item.recipe.cat} size={18} compact />
                <span className="t-cap truncate">{item.friendEmoji} {item.friendName}</span>
              </div>
              <div className="recipe-card-title font-bold mt-2">{item.recipe.name[lang] || item.recipe.name.en}</div>
              <div className="recipe-card-meta t-cap tabular">
                <span>{fmtNum(item.recipe.perServing.cal)} cal</span>
                <span>P {fmtNum(item.recipe.perServing.protein)}g</span>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard>
          <EmptyState
            icon="friends"
            title={lang === "zh" ? "還沒有朋友食譜" : "No friend recipes yet"}
            hint={lang === "zh" ? "朋友儲存食譜並同步後，就會出現在這裡。" : "Recipes appear after a friend saves one and syncs."}
          />
        </GlassCard>
      )}

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? <span className="icon-label"><FoodGlyph category={selected.recipe.cat} size={18} compact />{selected.recipe.name[lang] || selected.recipe.name.en}</span> : undefined}
      >
        {selected && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="chip self-start icon-label"><AppIcon name="friends" size={14} />{lang === "zh" ? `來自 ${selected.friendName}` : `From ${selected.friendName}`}</div>
            <div className="t-sub tabular">
              {fmtNum(selected.recipe.perServing.cal)} cal · P {fmtNum(selected.recipe.perServing.protein)}g · C {fmtNum(selected.recipe.perServing.carbs)}g · F {fmtNum(selected.recipe.perServing.fat)}g
            </div>
            <div>
              <div className="t-section mb-2">{lang === "zh" ? "食材" : "Ingredients"}</div>
              <div className="glass glass-sm px-4 py-1">
                {selected.recipe.ingredients.map((ingredient, index) => (
                  <div className="row" key={`${ingredient.name.en}-${index}`}>
                    <span className="flex-1">{ingredient.name[lang] || ingredient.name.en}</span>
                    <span className="t-sub">{ingredient.amount[lang] || ingredient.amount.en}</span>
                  </div>
                ))}
              </div>
            </div>
            {selected.recipe.steps?.length ? (
              <div>
                <div className="t-section mb-2">{lang === "zh" ? "作法" : "Method"}</div>
                <ol className="recipe-steps glass glass-sm">
                  {selected.recipe.steps.map((step, index) => <li key={`${step.en}-${index}`}>{step[lang] || step.en}</li>)}
                </ol>
              </div>
            ) : null}
            <button className="btn btn-primary press w-full" onClick={() => save(selected.friendId, selected.recipe)}>
              <AppIcon name="save" size={17} />{lang === "zh" ? "儲存到我的食譜" : "Save to my recipes"}
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/* ================================ RECIPES ================================ */

const CAT_KEYS: { v: RecipeCat | "all"; k: DictKey }[] = [
  { v: "all", k: "all" },
  { v: "asian", k: "catAsian" },
  { v: "western", k: "catWestern" },
  { v: "pasta", k: "catPasta" },
  { v: "breakfast", k: "catBreakfast" },
  { v: "veg", k: "catVeg" },
  { v: "custom", k: "catCustom" },
];

const DISCOVER_DIETS = [
  { value: "all", en: "Any diet", zh: "不限飲食" },
  { value: "highProtein", en: "High protein", zh: "高蛋白" },
  { value: "vegetarian", en: "Vegetarian", zh: "蛋奶素" },
  { value: "vegan", en: "Vegan", zh: "純素" },
  { value: "pescatarian", en: "Pescatarian", zh: "魚素" },
  { value: "keto", en: "Keto", zh: "生酮" },
  { value: "halal", en: "Halal", zh: "清真" },
  { value: "kosher", en: "Kosher", zh: "猶太潔食" },
  { value: "glutenFree", en: "Gluten-free", zh: "無麩質" },
  { value: "dairyFree", en: "Dairy-free", zh: "無乳製品" },
  { value: "lowFODMAP", en: "Low FODMAP", zh: "低 FODMAP" },
  { value: "paleo", en: "Paleo", zh: "原始人飲食" },
];

const DISCOVER_CUISINES = [
  { value: "all", en: "Any cuisine", zh: "不限菜系" },
  { value: "chinese", en: "Chinese", zh: "中式" },
  { value: "taiwanese", en: "Taiwanese", zh: "台灣" },
  { value: "vietnamese", en: "Vietnamese", zh: "越南" },
  { value: "korean", en: "Korean", zh: "韓式" },
  { value: "japanese", en: "Japanese", zh: "日式" },
  { value: "thai", en: "Thai", zh: "泰式" },
  { value: "indian", en: "Indian", zh: "印度" },
  { value: "middleEastern", en: "Middle Eastern", zh: "中東" },
  { value: "mediterranean", en: "Mediterranean", zh: "地中海" },
  { value: "mexican", en: "Mexican", zh: "墨西哥" },
  { value: "westAfrican", en: "West African", zh: "西非" },
  { value: "easternEuropean", en: "Eastern European", zh: "東歐" },
];

const DISCOVER_PAGE_SIZE = 8;

function RecipesTab() {
  const lang = useStore((s) => s.lang);
  const allRecipes = useStore((s) => s.recipes);
  const profile = useActiveProfile();
  const t = (k: DictKey) => translate(k, lang);

  const [cat, setCat] = useState<RecipeCat | "all">("all");
  const [sel, setSel] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [restrictionsOpen, setRestrictionsOpen] = useState(false);
  const updateProfile = useStore((s) => s.updateProfile);
  const restrictions = restrictionsFromProfile(profile);

  const recipes = useMemo(() => selectedRecipesForProfile(profile, allRecipes), [allRecipes, profile]);

  useEffect(() => {
    if (window.location.hash !== "#create-recipe") return;
    setCreating(true);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);

  const list = useMemo(
    () => (cat === "all" ? recipes : recipes.filter((r) => r.cat === cat)),
    [recipes, cat]
  );

  return (
    <div className="a-fadeUp">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="t-section">{lang === "zh" ? "已儲存食譜" : "Saved recipes"}</div>
          <div className="t-cap">{lang === "zh" ? "儲存一次，之後可重複加入任何餐期" : "Save once, then reuse in any meal slot"}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="chip press icon-label" onClick={() => setDiscovering(true)}>
            <AppIcon name="search" size={15} /> {lang === "zh" ? "尋找" : "Find"}
          </button>
          <button className="chip press chip-canta-on icon-label" onClick={() => setCreating(true)}>
            <AppIcon name="plus" size={15} /> {lang === "zh" ? "新增" : "Create"}
          </button>
        </div>
      </div>

      <GlassCard className="recipe-restrictions-card mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="t-section icon-label"><AppIcon name="warning" size={17} />{lang === "zh" ? "避免食材" : "Ingredients to avoid"}</div>
            {restrictions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {restrictions.map((restriction) => <span className="chip restriction-chip" key={restriction}>{restriction}</span>)}
              </div>
            ) : (
              <div className="t-cap mt-1">{lang === "zh" ? "尚未加入限制" : "No restrictions added"}</div>
            )}
          </div>
          <button className="chip press shrink-0 icon-label" onClick={() => setRestrictionsOpen(true)}>
            <AppIcon name={restrictions.length ? "edit" : "plus"} size={15} />
            {restrictions.length ? (lang === "zh" ? "編輯" : "Edit") : (lang === "zh" ? "加入" : "Add")}
          </button>
        </div>
      </GlassCard>

      {recipes.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="kitchen"
            title={lang === "zh" ? "還沒有儲存食譜" : "No saved recipes yet"}
            hint={lang === "zh" ? "瀏覽推薦，選擇你真的想準備的餐點。" : "Browse suggestions and add only meals you actually want to make."}
          />
        </GlassCard>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="recipe-filter-rail flex flex-1 min-w-0 gap-2 overflow-x-auto hide-scroll pb-1">
              {CAT_KEYS.map(({ v, k }) => (
                <button key={v} className={`chip press ${cat === v ? "chip-on" : ""}`} onClick={() => setCat(v)}>
                  {t(k)}
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <GlassCard><EmptyState icon="search" title={lang === "zh" ? "此分類沒有食譜" : "No recipes in this category"} /></GlassCard>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {list.map((r) => (
                <GlassCard key={r.id} className="recipe-card press" onClick={() => setSel(r)}>
                  <SavedFoodGlyph icon={r.custom ? r.emoji : undefined} category={r.cat} size={18} compact />
                  <div className="recipe-card-title font-bold mt-2">{r.name[lang]}</div>
                  <div className="recipe-card-meta t-cap tabular">
                    <span>{fmtNum(r.perServing.cal)} {t("cal")}</span>
                    <span className="icon-label"><AppIcon name="timer" size={13} />{r.minutes}{lang === "zh" ? "分" : "m"}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      <RecipeDetailSheet recipe={sel} onClose={() => setSel(null)} onEdit={(r) => { setSel(null); setEditing(r); }} />
      <RecipeFormSheet open={creating || !!editing} initial={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      <DiscoverRecipesSheet open={discovering} onClose={() => setDiscovering(false)} />
      <Sheet
        open={restrictionsOpen}
        onClose={() => setRestrictionsOpen(false)}
        title={<span className="icon-label"><AppIcon name="warning" size={19} />{lang === "zh" ? "避免食材" : "Ingredients to avoid"}</span>}
      >
        <div className="pb-2">
          <p className="t-sub mb-3">
            {lang === "zh" ? "加入食材或類別後，尋找食譜時會自動排除相符結果。" : "Add an ingredient or group and matching recipes will be hidden from discovery."}
          </p>
          <IngredientRestrictionEditor
            value={restrictions}
            onChange={(next) => updateProfile(profile.id, { ingredientRestrictions: next, allergies: next.join(", ") })}
            lang={lang}
          />
        </div>
      </Sheet>
    </div>
  );
}

function DiscoverRecipesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useStore((s) => s.lang);
  const t = (key: DictKey) => translate(key, lang);
  const allRecipes = useStore((s) => s.recipes);
  const selectRecipe = useStore((s) => s.selectRecipe);
  const profile = useActiveProfile();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RecipeCat | "all">("all");
  const [diet, setDiet] = useState("all");
  const [cuisine, setCuisine] = useState("all");
  const [page, setPage] = useState(1);
  const restrictions = restrictionsFromProfile(profile);
  const selected = useMemo(() => new Set(profile.selectedRecipeIds ?? []), [profile.selectedRecipeIds]);
  const available = useMemo(() => allRecipes.filter((recipe) => !selected.has(recipe.id) && !recipe.custom), [allRecipes, selected]);
  const eligible = useMemo(
    () => filterRecipes(available, { excludeIngredients: restrictions }),
    [available, restrictions]
  );
  const ranked = useMemo(() => recommendRecipes(profile, eligible, eligible.length), [profile, eligible]);
  const suggested = useMemo(() => ranked.slice(0, 3), [ranked]);
  const list = useMemo(
    () => filterRecipes(ranked, { query, category, diet, cuisine }),
    [ranked, query, category, diet, cuisine]
  );
  const hasFilters = query.trim().length > 0 || category !== "all" || diet !== "all" || cuisine !== "all";
  const ideas = useMemo(() => {
    if (hasFilters) return list;
    const suggestedIds = new Set(suggested.map((recipe) => recipe.id));
    return list.filter((recipe) => !suggestedIds.has(recipe.id));
  }, [hasFilters, list, suggested]);
  const paginated = paginateRecipes(ideas, page, DISCOVER_PAGE_SIZE);

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setQuery("");
    setCategory("all");
    setDiet("all");
    setCuisine("all");
    resetPage();
  };

  const add = (recipe: Recipe) => {
    selectRecipe(recipe.id);
    toast(lang === "zh" ? `已儲存 ${recipe.name.zh}` : `Saved ${recipe.name.en}`, "checkCircle");
  };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name="spark" size={19} />{lang === "zh" ? "尋找食譜" : "Find recipes"}</span>}>
      <div className="flex flex-col gap-4 pb-2">
        <p className="t-sub">{lang === "zh" ? "這裡是可選的食譜庫。只有你點選「儲存」的食譜才會出現在已儲存食譜。" : "This is the suggestion catalog. A recipe appears in Saved recipes only after you save it."}</p>
        {restrictions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="t-cap font-semibold">{lang === "zh" ? "已排除：" : "Excluded:"}</span>
            {restrictions.map((restriction) => <span className="chip" key={restriction}>{restriction}</span>)}
          </div>
        )}
        {suggested.length > 0 && !hasFilters && (
          <div>
            <div className="t-section mb-2">{lang === "zh" ? "為你推薦" : "Suggested for you"}</div>
            <div className="flex flex-col gap-2">
              {suggested.map((recipe) => <DiscoverRecipeRow key={recipe.id} recipe={recipe} onAdd={() => add(recipe)} />)}
            </div>
          </div>
        )}
        <div>
          <div className="t-section mb-2">{lang === "zh" ? "所有想法" : "All ideas"}</div>
          <input
            className="field mb-2"
            value={query}
            onChange={(event) => { setQuery(event.target.value); resetPage(); }}
            placeholder={lang === "zh" ? "搜尋中文或英文食譜" : "Search recipe names"}
            aria-label={lang === "zh" ? "搜尋食譜" : "Search recipes"}
          />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              className="field"
              value={category}
              onChange={(event) => { setCategory(event.target.value as RecipeCat | "all"); resetPage(); }}
              aria-label={lang === "zh" ? "分類" : "Category"}
            >
              {CAT_KEYS.filter(({ v }) => v !== "custom").map(({ v, k }) => <option key={v} value={v}>{t(k)}</option>)}
            </select>
            <select
              className="field"
              value={diet}
              onChange={(event) => { setDiet(event.target.value); resetPage(); }}
              aria-label={lang === "zh" ? "飲食方式" : "Diet"}
            >
              {DISCOVER_DIETS.map((option) => <option key={option.value} value={option.value}>{option[lang]}</option>)}
            </select>
          </div>
          <select
            className="field mb-2"
            value={cuisine}
            onChange={(event) => { setCuisine(event.target.value); resetPage(); }}
            aria-label={lang === "zh" ? "菜系" : "Cuisine"}
          >
            {DISCOVER_CUISINES.map((option) => <option key={option.value} value={option.value}>{option[lang]}</option>)}
          </select>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="t-cap tabular">
              {lang === "zh" ? `${paginated.totalItems} 道食譜` : `${paginated.totalItems} ${paginated.totalItems === 1 ? "recipe" : "recipes"}`}
            </span>
            {hasFilters && <button className="chip press" onClick={clearFilters}>{lang === "zh" ? "清除篩選" : "Clear filters"}</button>}
          </div>
          <div>
            {paginated.items.map((recipe) => <DiscoverRecipeRow key={recipe.id} recipe={recipe} onAdd={() => add(recipe)} />)}
            {paginated.totalItems === 0 && (
              <EmptyState
                icon={hasFilters ? "search" : "checkCircle"}
                title={hasFilters ? (lang === "zh" ? "找不到相符食譜" : "No matching recipes") : (lang === "zh" ? "已全部加入" : "Everything is already added")}
                hint={hasFilters ? (lang === "zh" ? "請調整搜尋文字或篩選條件。" : "Try changing your search or filters.") : undefined}
              />
            )}
          </div>
          {paginated.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-3">
              <button className="chip press" disabled={paginated.page === 1} onClick={() => setPage(paginated.page - 1)}>
                {lang === "zh" ? "上一頁" : "Previous"}
              </button>
              <span className="t-cap tabular">
                {lang === "zh" ? `第 ${paginated.page} / ${paginated.totalPages} 頁` : `Page ${paginated.page} of ${paginated.totalPages}`}
              </span>
              <button className="chip press" disabled={paginated.page === paginated.totalPages} onClick={() => setPage(paginated.page + 1)}>
                {lang === "zh" ? "下一頁" : "Next"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function DiscoverRecipeRow({ recipe, onAdd }: { recipe: Recipe; onAdd: () => void }) {
  const lang = useStore((s) => s.lang);
  return (
    <div className="row">
      <FoodGlyph category={recipe.cat} size={18} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate" style={{ fontSize: 15 }}>{recipe.name[lang]}</div>
        <div className="t-cap tabular">{fmtNum(recipe.perServing.cal)} cal · {recipe.minutes}{lang === "zh" ? "分" : "m"} · P {Math.round(recipe.perServing.protein)}g</div>
      </div>
      <button className="chip chip-canta-on press icon-label" onClick={onAdd}><AppIcon name="save" size={15} />{lang === "zh" ? "儲存" : "Save"}</button>
    </div>
  );
}

function RecipeDetailSheet({
  recipe,
  onClose,
  onEdit,
}: {
  recipe: Recipe | null;
  onClose: () => void;
  onEdit: (r: Recipe) => void;
}) {
  const lang = useStore((s) => s.lang);
  const addLog = useStore((s) => s.addLog);
  const addGroceriesBulk = useStore((s) => s.addGroceriesBulk);
  const planMeal = useStore((s) => s.planMeal);
  const unselectRecipe = useStore((s) => s.unselectRecipe);
  const t = (k: DictKey) => translate(k, lang);

  const [planPick, setPlanPick] = useState(false);
  const [cookCount, setCookCount] = useState(1);
  const [cookSlot, setCookSlot] = useState<MealSlot>(defaultMealByTime());

  if (!recipe) return null;
  const r = recipe;
  const basis = nutritionBasis(r);

  const cook = () => {
    const xp = addLog({
      date: todayStr(),
      meal: cookSlot,
      name: r.name,
      emoji: r.emoji,
      macros: mulMacros(r.perServing, cookCount),
      src: "recipe",
      refId: r.id,
    });
    toast(`${t("cooked")}${xp > 0 ? ` · +${xp} XP` : ""}`, r.emoji);
    onClose();
  };

  const addIngredients = () => {
    addGroceriesBulk(
      r.ingredients.map((i) => ({
        name: i.name,
        qty: i.amount[lang],
        checked: false,
        cat: i.cat ?? "other",
      }))
    );
    toast(t("addedToGroceries"), "shopping");
  };

  return (
    <>
    <Sheet open onClose={onClose} title={<span className="icon-label"><SavedFoodGlyph icon={r.custom ? r.emoji : undefined} category={r.cat} size={18} compact /> {r.name[lang]}</span>}>
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex gap-2 flex-wrap">
          <span className="chip icon-label"><AppIcon name="timer" size={15} /> {r.minutes} {t("minutes")}</span>
          <span className="chip icon-label"><AppIcon name="star" size={15} /> {r.difficulty}/3</span>
        </div>
        <div className="t-sub tabular">
          {fmtNum(r.perServing.cal)} {t("cal")} · {t("protein")} {Math.round(r.perServing.protein)}g · {t("carbs")}{" "}
          {Math.round(r.perServing.carbs)}g · {t("fat")} {Math.round(r.perServing.fat)}g <span className="t-cap">/ {basis.amount} {nutritionUnitLabel(basis.unit, basis.amount, lang)}</span>
        </div>

        <div>
          <div className="t-section mb-2">{t("ingredients")}</div>
          <div className="glass glass-sm px-4 py-1" style={{ boxShadow: "none" }}>
            {r.ingredients.map((i, idx) => (
              <div key={idx} className="row" style={{ padding: "9px 0" }}>
                <div className="flex-1">{i.name[lang]}</div>
                <div className="t-sub">{i.amount[lang]}</div>
              </div>
            ))}
          </div>
        </div>

        {r.steps?.length ? (
          <div>
            <div className="t-section mb-2">{lang === "zh" ? "做法" : "Method"}</div>
            <ol className="recipe-steps glass glass-sm">
              {r.steps.map((step, idx) => (
                <li key={`${step.en}-${idx}`}>{step[lang] || step.en}</li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="t-sub font-semibold">{t("servings")}</span>
          <Stepper value={cookCount} onChange={setCookCount} step={0.5} min={0.5} format={(v) => `× ${v}`} />
        </div>

        <div className="seg">
          {MEAL_ORDER.map((s) => (
            <button
              key={s}
              className={`seg-item ${cookSlot === s ? "on" : ""}`}
              onClick={() => setCookSlot(s)}
              aria-label={translate(s as DictKey, lang)}
              aria-pressed={cookSlot === s}
            >
              <MealGlyph meal={s} size={17} />
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <button className="btn btn-primary press" onClick={cook}>
            <span className="icon-label"><AppIcon name="kitchen" size={18} /> {t("cook")} — {fmtNum(r.perServing.cal * cookCount)} {t("cal")}</span>
          </button>
          <div className="flex gap-2">
            <button className="btn press flex-1" onClick={() => setPlanPick(true)}>
              <span className="icon-label"><AppIcon name="calendar" size={17} /> {t("addToPlan")}</span>
            </button>
            <button className="btn press flex-1" onClick={addIngredients}>
              <span className="icon-label"><AppIcon name="shopping" size={17} /> {t("groceries")}</span>
            </button>
          </div>
          <button className="btn btn-ghost press" onClick={() => onEdit(r)}>
            <span className="icon-label"><AppIcon name="edit" size={17} /> {t("edit")}</span>
          </button>
          {!r.custom && (
            <button
              className="btn btn-ghost btn-danger press"
              onClick={() => {
                unselectRecipe(r.id);
                toast(lang === "zh" ? "已從已儲存食譜移除" : "Removed from Saved recipes", "checkCircle");
                onClose();
              }}
            >
              <span className="icon-label"><AppIcon name="close" size={17} />{lang === "zh" ? "取消儲存食譜" : "Remove from Saved recipes"}</span>
            </button>
          )}
        </div>
      </div>

      {planPick && (
        <PlanSlotPicker
          onPick={(date, slot) => {
            planMeal(date, slot, r.id, cookCount);
            toast(`${fmtDate(date, lang)} · ${translate(slot as DictKey, lang)}`, "calendar");
            setPlanPick(false);
          }}
          onClose={() => setPlanPick(false)}
        />
      )}
    </Sheet>
    </>
  );
}

function PlanSlotPicker({
  onPick,
  onClose,
}: {
  onPick: (date: string, slot: MealSlot) => void;
  onClose: () => void;
}) {
  const lang = useStore((s) => s.lang);
  const days = weekDates(todayStr()).concat(weekDates(addDays(todayStr(), 7)).slice(0, 3));
  const [date, setDate] = useState(todayStr());

  return (
    <Sheet open onClose={onClose} title={translate("addToPlan", lang)}>
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scroll pb-1">
        {days.map((d) => (
          <button key={d} className={`chip press ${d === date ? "chip-on" : ""}`} onClick={() => setDate(d)}>
            {weekdayLabel(d, lang)} {fmtDate(d, lang)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pb-2">
        {MEAL_ORDER.map((slot) => (
          <button key={slot} className="btn press" onClick={() => onPick(date, slot)}>
            <span className="icon-label"><MealGlyph meal={slot} size={17} /> {translate(slot as DictKey, lang)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------- recipe create / edit ------------------------- */

function RecipeFormSheet({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: Recipe | null;
  onClose: () => void;
}) {
  const lang = useStore((s) => s.lang);
  const addRecipe = useStore((s) => s.addRecipe);
  const updateRecipe = useStore((s) => s.updateRecipe);
  const deleteRecipe = useStore((s) => s.deleteRecipe);
  const t = (k: DictKey) => translate(k, lang);

  const blank = {
    name: "",
    emoji: "",
    cat: "custom" as RecipeCat,
    minutes: 20,
    difficulty: 1 as 1 | 2 | 3,
    servings: 2,
    cal: "",
    p: "",
    c: "",
    f: "",
    routineDays: [] as number[],
    routineMeal: "" as MealSlot | "",
    ings: [] as { name: string; amount: string }[],
  };
  const [form, setForm] = useState(blank);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [calEdited, setCalEdited] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState("");

  if (open && initial && loadedId !== initial.id) {
    const calculated = caloriesFromMacros(initial.perServing);
    setLoadedId(initial.id);
    setCalEdited(Math.abs(initial.perServing.cal - calculated) >= 1);
    setForm({
      name: initial.name[lang] || initial.name.en,
      emoji: initial.emoji,
      cat: initial.cat,
      minutes: initial.minutes,
      difficulty: initial.difficulty,
      servings: initial.servings,
      cal: String(initial.perServing.cal),
      p: String(initial.perServing.protein),
      c: String(initial.perServing.carbs),
      f: String(initial.perServing.fat),
      routineDays: initial.routine?.days ?? [],
      routineMeal: initial.routine?.meal ?? "",
      ings: initial.ingredients.map((i) => ({ name: i.name[lang] || i.name.en, amount: i.amount[lang] || i.amount.en })),
    });
  }
  if (!open && loadedId !== null) setLoadedId(null);
  if (!open && form !== blank && form.name !== "" && loadedId === null) {
    // reset after close of a create form — cheap guard
  }

  const setF = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const autoCal = caloriesFromMacros({ protein: Number(form.p) || 0, carbs: Number(form.c) || 0, fat: Number(form.f) || 0 });
  const iconResults = SELECTABLE_ICONS.filter((icon) => {
    const query = iconQuery.trim().toLowerCase();
    return !query || `${icon.label} ${icon.name} ${icon.keywords}`.toLowerCase().includes(query);
  });

  const save = () => {
    if (!form.name.trim()) return;
    const ingredients: Ingredient[] = form.ings
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: { en: i.name, zh: i.name },
        amount: { en: i.amount, zh: i.amount },
      }));
    const data = {
      name: { en: form.name, zh: form.name },
      emoji: form.emoji,
      cat: form.cat,
      minutes: form.minutes,
      difficulty: form.difficulty,
      servings: form.servings,
      perServing: {
        cal: calEdited ? Number(form.cal) || 0 : autoCal,
        protein: Number(form.p) || 0,
        carbs: Number(form.c) || 0,
        fat: Number(form.f) || 0,
      },
      nutritionBasis: initial ? nutritionBasis(initial) : { amount: 1, unit: "serving" as const },
      routine: form.routineDays.length ? { days: form.routineDays, meal: form.routineMeal || undefined } : undefined,
      ingredients,
      tags: [],
      custom: true,
    };
    if (initial) {
      updateRecipe(initial.id, data);
    } else {
      addRecipe({ ...data, id: `cr-${newId()}` });
    }
    toast(t("saved"), "checkCircle");
    setForm(blank);
    setCalEdited(false);
    setIconOpen(false);
    setIconQuery("");
    setLoadedId(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name={initial ? "edit" : "plus"} size={20} /> {initial ? t("edit") : t("newRecipe")}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <input className="field" placeholder={t("recipeName")} value={form.name} onChange={(e) => setF({ name: e.target.value })} />

        <div>
          <div className="t-cap mb-1">{lang === "zh" ? "圖示（選填）" : "Icon (optional)"}</div>
          <div className="recipe-icon-choice">
            <button type="button" className="recipe-icon-choice-main press" onClick={() => setIconOpen((value) => !value)}>
              <span>{form.emoji ? <AppIcon name={form.emoji as Parameters<typeof AppIcon>[0]["name"]} size={21} /> : <AppIcon name="plus" size={19} />}</span>
              <b>{form.emoji ? SELECTABLE_ICONS.find((icon) => icon.name === form.emoji)?.label ?? form.emoji : (lang === "zh" ? "選擇圖示" : "Choose an icon")}</b>
            </button>
            {form.emoji && <button type="button" className="ibtn press" onClick={() => setF({ emoji: "" })} aria-label={lang === "zh" ? "移除圖示" : "Remove icon"}><AppIcon name="close" size={15} /></button>}
          </div>
          {iconOpen && (
            <div className="recipe-icon-picker mt-2">
              <div className="food-composer recipe-icon-search">
                <AppIcon name="search" size={17} />
                <input value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} placeholder={lang === "zh" ? "搜尋圖示" : "Search icons"} aria-label={lang === "zh" ? "搜尋圖示" : "Search icons"} />
              </div>
              <div className="recipe-icon-grid">
                {iconResults.map((icon) => (
                  <button key={icon.name} type="button" className={`press ${form.emoji === icon.name ? "is-selected" : ""}`} title={icon.label} onClick={() => { setF({ emoji: icon.name }); setIconOpen(false); }}>
                    <AppIcon name={icon.name} size={20} /><small>{icon.label}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scroll pb-1">
          {CAT_KEYS.filter((c) => c.v !== "all").map(({ v, k }) => (
            <button key={v} className={`chip press ${form.cat === v ? "chip-on" : ""}`} onClick={() => setF({ cat: v as RecipeCat })}>
              {t(k)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="t-cap mb-1 icon-label"><AppIcon name="timer" size={14} /> {t("minutes")}</div>
            <input className="field" inputMode="numeric" value={form.minutes} onChange={(e) => setF({ minutes: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <div className="t-cap mb-1">{t("difficulty")}</div>
            <div className="seg">
              {([1, 2, 3] as const).map((d) => (
                <button key={d} className={`seg-item ${form.difficulty === d ? "on" : ""}`} onClick={() => setF({ difficulty: d })}>
                  <span className="icon-label"><AppIcon name="star" size={14} /> {d}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="t-cap mb-1">{t("servings")}</div>
            <DecimalInput className="field" min={0.01} value={form.servings} onChange={(servings) => setF({ servings })} ariaLabel={t("servings")} />
          </div>
        </div>

        <div className="t-section">{lang === "zh" ? "每份營養" : "Nutrition per serving"}</div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" inputMode="decimal" placeholder={`${t("protein")} g`} value={form.p} onChange={(e) => setF({ p: e.target.value })} />
          <input className="field" inputMode="decimal" placeholder={`${t("carbs")} g`} value={form.c} onChange={(e) => setF({ c: e.target.value })} />
          <input className="field" inputMode="decimal" placeholder={`${t("fat")} g`} value={form.f} onChange={(e) => setF({ f: e.target.value })} />
          <div className="field-with-action">
            <input className="field" inputMode="numeric" placeholder={t("cal")} value={calEdited ? form.cal : String(autoCal)} onChange={(e) => { setF({ cal: e.target.value }); setCalEdited(true); }} />
            {calEdited && <button type="button" className="field-action press" onClick={() => { setF({ cal: String(autoCal) }); setCalEdited(false); }}>{lang === "zh" ? "自動" : "Auto"}</button>}
          </div>
        </div>
        <div className="t-cap">{lang === "zh" ? "熱量是最後一欄，會依三大營養素自動計算，也可以直接修改。" : "Calories are the last field and auto-calculate from the macros; you can still override them."}</div>

        <div className="t-section">{lang === "zh" ? "固定頻率（選填）" : "Regular cadence (optional)"}</div>
        <div className="routine-day-grid">
          {[
            { day: 0, en: "Sun", zh: "日" }, { day: 1, en: "Mon", zh: "一" }, { day: 2, en: "Tue", zh: "二" },
            { day: 3, en: "Wed", zh: "三" }, { day: 4, en: "Thu", zh: "四" }, { day: 5, en: "Fri", zh: "五" },
            { day: 6, en: "Sat", zh: "六" },
          ].map((item) => (
            <button key={item.day} type="button" aria-pressed={form.routineDays.includes(item.day)} className={`press ${form.routineDays.includes(item.day) ? "is-selected" : ""}`} onClick={() => setF({ routineDays: form.routineDays.includes(item.day) ? form.routineDays.filter((day) => day !== item.day) : [...form.routineDays, item.day].sort() })}>
              {lang === "zh" ? item.zh : item.en}
            </button>
          ))}
        </div>
        {form.routineDays.length > 0 && (
          <select className="field" value={form.routineMeal} onChange={(event) => setF({ routineMeal: event.target.value as MealSlot | "" })}>
            <option value="">{lang === "zh" ? "任何餐期" : "Any meal"}</option>
            {MEAL_ORDER.map((slot) => <option key={slot} value={slot}>{translate(slot as DictKey, lang)}</option>)}
          </select>
        )}

        <div className="t-section">{t("ingredients")}</div>
        {form.ings.map((i, idx) => (
          <div key={idx} className="flex gap-2">
            <input className="field flex-1" placeholder={t("itemName")} value={i.name} onChange={(e) => setF({ ings: form.ings.map((x, j) => (j === idx ? { ...x, name: e.target.value } : x)) })} />
            <input className="field" style={{ width: 90 }} placeholder="200 g" value={i.amount} onChange={(e) => setF({ ings: form.ings.map((x, j) => (j === idx ? { ...x, amount: e.target.value } : x)) })} />
            <button className="ibtn press shrink-0" style={{ width: 36, height: 46, borderRadius: 14 }} onClick={() => setF({ ings: form.ings.filter((_, j) => j !== idx) })}><AppIcon name="close" size={17} /></button>
          </div>
        ))}
        <button className="btn btn-ghost press" onClick={() => setF({ ings: [...form.ings, { name: "", amount: "" }] })}>
          <AppIcon name="plus" size={17} /> {t("ingredients")}
        </button>

        <div className="flex gap-2">
          {initial?.custom && (
            <button
              className="btn btn-ghost btn-danger press"
              onClick={() => {
                deleteRecipe(initial.id);
                toast(t("deleted"), "trash");
                setLoadedId(null);
                onClose();
              }}
            >
              {t("delete")}
            </button>
          )}
          <button className="btn btn-primary press flex-1" disabled={!form.name.trim()} onClick={save}>
            {t("save")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ================================ PLANNER ================================ */

function PlannerTab({ onBuiltList }: { onBuiltList: () => void }) {
  const lang = useStore((s) => s.lang);
  const recipes = useStore((s) => s.recipes);
  const planner = useStore((s) => s.planner);
  const mealPlanTemplates = useStore((s) => s.mealPlanTemplates);
  const unplanMeal = useStore((s) => s.unplanMeal);
  const planMeal = useStore((s) => s.planMeal);
  const updatePlannedMeal = useStore((s) => s.updatePlannedMeal);
  const saveMealPlanTemplate = useStore((s) => s.saveMealPlanTemplate);
  const applyMealPlanTemplate = useStore((s) => s.applyMealPlanTemplate);
  const deleteMealPlanTemplate = useStore((s) => s.deleteMealPlanTemplate);
  const addLog = useStore((s) => s.addLog);
  const addGroceriesBulk = useStore((s) => s.addGroceriesBulk);
  const t = (k: DictKey) => translate(k, lang);

  const [weekOffset, setWeekOffset] = useState(0);
  const days = weekDates(addDays(todayStr(), weekOffset * 7));
  const [picker, setPicker] = useState<{ date: string; slot: MealSlot } | null>(null);
  const [pmEdit, setPmEdit] = useState<{ date: string; slot: MealSlot; idx: number } | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [applyMode, setApplyMode] = useState<MealPlanApplyMode>("merge");

  const rid = (id: string) => recipes.find((r) => r.id === id);
  const weekMealCount = mealPlanMealCount(days.map((date) => planner[date] ?? {}));

  // Weekly calorie summary scales by planned servings.
  let weekCal = 0;
  let plannedDays = 0;
  for (const d of days) {
    const dp = planner[d];
    if (!dp) continue;
    let dayK = 0;
    for (const slot of MEAL_ORDER) {
      for (const pm of dp[slot] ?? []) {
        const r = rid(pm.recipeId);
        if (!r) continue;
        dayK += r.perServing.cal * pm.servings;
      }
    }
    if (dayK > 0) {
      weekCal += dayK;
      plannedDays += 1;
    }
  }

  const buildGroceries = () => {
    const agg = new Map<string, GroceryItem & { count: number }>();
    for (const d of days) {
      const dp = planner[d];
      if (!dp) continue;
      for (const slot of MEAL_ORDER) {
        for (const pm of dp[slot] ?? []) {
          const r = rid(pm.recipeId);
          if (!r) continue;
          for (const i of r.ingredients) {
            const key = i.name.en.toLowerCase();
            const cur = agg.get(key);
            if (cur) {
              cur.count += 1;
              cur.qty = `${i.amount[lang]} ×${cur.count}`;
            } else {
              agg.set(key, {
                id: "",
                name: i.name,
                qty: i.amount[lang],
                checked: false,
                cat: i.cat ?? "other",
                count: 1,
              });
            }
          }
        }
      }
    }
    const items = Array.from(agg.values()).map((x) => ({
      name: x.name,
      qty: x.qty,
      checked: false,
      cat: x.cat,
    }));
    if (items.length === 0) return;
    addGroceriesBulk(items);
    toast(`+${items.length} ${t("groceries")}`, "shopping");
    onBuiltList();
  };

  return (
    <div className="a-fadeUp">
      {/* week switch */}
      <div className="flex items-center justify-between mb-3">
        <button className="ibtn press" onClick={() => setWeekOffset((w) => w - 1)} aria-label={lang === "zh" ? "上一週" : "Previous week"}><AppIcon name="back" size={18} /></button>
        <div className="font-bold">
          {fmtDate(days[0], lang)} – {fmtDate(days[6], lang)}
          {weekOffset === 0 && <span className="t-cap"> · {t("planWeek")}</span>}
        </div>
        <button className="ibtn press" onClick={() => setWeekOffset((w) => w + 1)} aria-label={lang === "zh" ? "下一週" : "Next week"}><AppIcon name="next" size={18} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          className="btn press"
          disabled={weekMealCount === 0}
          onClick={() => {
            setTemplateName(lang === "zh" ? `${fmtDate(days[0], lang)} 備餐週` : `Week of ${fmtDate(days[0], lang)}`);
            setSaveTemplateOpen(true);
          }}
        >
          <AppIcon name="save" size={17} />{lang === "zh" ? "儲存本週" : "Save this week"}
        </button>
        <button className="btn press" onClick={() => setTemplatesOpen(true)}>
          <AppIcon name="copy" size={17} />{lang === "zh" ? "我的週計畫" : "Saved plans"}
          {mealPlanTemplates.length > 0 && <span className="chip" style={{ padding: "2px 7px", fontSize: 11 }}>{mealPlanTemplates.length}</span>}
        </button>
      </div>

      {/* summary */}
      {plannedDays > 0 && (
        <GlassCard className="p-4 mb-3">
          <div className="text-center">
            <div className="t-num font-extrabold" style={{ fontSize: 22 }}>
              {fmtNum(weekCal / plannedDays)}
            </div>
            <div className="t-cap">{t("weekCalAvg")}</div>
          </div>
        </GlassCard>
      )}

      {days.map((d) => {
        const dp = planner[d] ?? {};
        const isToday = d === todayStr();
        let dayK = 0;
        for (const slot of MEAL_ORDER)
          for (const pm of dp[slot] ?? []) dayK += (rid(pm.recipeId)?.perServing.cal ?? 0) * pm.servings;
        return (
          <GlassCard key={d} className="px-4 py-3 mb-3" strong={isToday}>
            <div className="flex items-center justify-between mb-1">
              <div className="font-bold" style={{ color: isToday ? "var(--melon-600)" : undefined }}>
                {weekdayLabel(d, lang)} <span className="t-cap">{fmtDate(d, lang)}</span>
              </div>
              {dayK > 0 && <span className="t-cap tabular">{fmtNum(dayK)} {t("cal")}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_ORDER.map((slot) => {
                const items = dp[slot] ?? [];
                return (
                  <div
                    key={slot}
                    className="glass-sm"
                    style={{ background: "var(--track)", borderRadius: 14, padding: "8px 10px", minHeight: 52 }}
                  >
                    <div className="t-cap font-semibold mb-1">
                      <span className="icon-label"><MealGlyph meal={slot} size={15} /> {translate(slot as DictKey, lang)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {items.map((pm, i) => {
                        const r = rid(pm.recipeId);
                        if (!r) return null;
                        return (
                          <span
                            key={i}
                            className="chip press"
                            style={{ padding: "4px 9px", fontSize: 12.5 }}
                            onClick={() => setPmEdit({ date: d, slot, idx: i })}
                          >
                            {r.name[lang].slice(0, 8)}
                            {pm.servings !== 1 && <b className="tabular"> ×{pm.servings}</b>}
                            <button
                              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, marginLeft: 2 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                unplanMeal(d, slot, i);
                              }}
                            >
                              <AppIcon name="close" size={16} />
                            </button>
                          </span>
                        );
                      })}
                      <button
                        className="chip press"
                        style={{ padding: "4px 9px", fontSize: 12.5 }}
                        onClick={() => setPicker({ date: d, slot })}
                        aria-label={`${t("add")} · ${translate(slot as DictKey, lang)}`}
                      >
                        <AppIcon name="plus" size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        );
      })}

      <button className="btn btn-primary press w-full mb-2" onClick={buildGroceries} disabled={!plannedDays}>
        <span className="icon-label"><AppIcon name="shopping" size={18} /> {t("generateList")}</span>
      </button>

      <Sheet open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} title={<span className="icon-label"><AppIcon name="save" size={19} />{lang === "zh" ? "儲存週計畫" : "Save meal plan"}</span>}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="t-sub">{lang === "zh" ? `將本週 ${weekMealCount} 餐儲存成可重複使用的範本。` : `Save these ${weekMealCount} planned meals as a reusable weekly template.`}</p>
          <input className="field" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder={lang === "zh" ? "計畫名稱" : "Plan name"} />
          <button
            className="btn btn-primary press"
            disabled={!templateName.trim() || weekMealCount === 0}
            onClick={() => {
              const saved = saveMealPlanTemplate(templateName, days[0]);
              if (!saved) return;
              toast(lang === "zh" ? "週計畫已儲存" : "Meal plan saved", "save");
              setSaveTemplateOpen(false);
            }}
          >
            <AppIcon name="save" size={17} />{lang === "zh" ? "儲存計畫" : "Save plan"}
          </button>
        </div>
      </Sheet>

      <Sheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} title={<span className="icon-label"><AppIcon name="copy" size={19} />{lang === "zh" ? "我的週計畫" : "Saved meal plans"}</span>}>
        <div className="pb-2">
          {mealPlanTemplates.length === 0 ? (
            <EmptyState icon="calendar" title={lang === "zh" ? "還沒有儲存週計畫" : "No saved meal plans"} hint={lang === "zh" ? "先在週行事曆安排餐點，再儲存本週。" : "Plan a week first, then save it as a reusable template."} />
          ) : (
            <>
              <div className="seg mb-2">
                <button className={`seg-item ${applyMode === "merge" ? "on" : ""}`} onClick={() => setApplyMode("merge")}>{lang === "zh" ? "加入本週" : "Add to week"}</button>
                <button className={`seg-item ${applyMode === "replace" ? "on" : ""}`} onClick={() => setApplyMode("replace")}>{lang === "zh" ? "取代本週" : "Replace week"}</button>
              </div>
              <p className="t-cap mb-3">
                {applyMode === "merge"
                  ? (lang === "zh" ? "保留現有餐點，加入尚未安排的食譜。" : "Keeps existing meals and adds recipes that are not already in each slot.")
                  : (lang === "zh" ? "目前顯示週的餐點會被此範本取代。" : "The displayed week will be replaced by the selected template.")}
              </p>
              <div className="flex flex-col gap-2">
                {mealPlanTemplates.map((template) => (
                  <GlassCard key={template.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{template.name}</div>
                        <div className="t-cap">{mealPlanMealCount(template.days)} {lang === "zh" ? "餐 · 7 天範本" : "meals · 7-day template"}</div>
                      </div>
                      <button
                        className="ibtn press"
                        aria-label={lang === "zh" ? `刪除 ${template.name}` : `Delete ${template.name}`}
                        onClick={() => deleteMealPlanTemplate(template.id)}
                      ><AppIcon name="trash" size={16} /></button>
                    </div>
                    <button
                      className="btn btn-primary press w-full mt-2"
                      onClick={() => {
                        applyMealPlanTemplate(template.id, days[0], applyMode);
                        toast(lang === "zh" ? "週計畫已套用" : "Meal plan applied", "calendar");
                        setTemplatesOpen(false);
                      }}
                    >
                      <AppIcon name="copy" size={17} />{lang === "zh" ? "套用至顯示週" : "Use in displayed week"}
                    </button>
                  </GlassCard>
                ))}
              </div>
            </>
          )}
        </div>
      </Sheet>

      {/* picker sheet */}
      {picker && (
        <Sheet open onClose={() => setPicker(null)} title={<span className="icon-label"><MealGlyph meal={picker.slot} /> {translate(picker.slot as DictKey, lang)} · {fmtDate(picker.date, lang)}</span>}>
          <RecipeQuickPick
            onPick={(r) => {
              planMeal(picker.date, picker.slot, r.id, 1);
              setPicker(null);
            }}
          />
        </Sheet>
      )}

      {/* planned meal editor */}
      {pmEdit &&
        (() => {
          const pm = (planner[pmEdit.date]?.[pmEdit.slot] ?? [])[pmEdit.idx];
          const r = pm ? rid(pm.recipeId) : undefined;
          if (!pm || !r) return null;
          return (
            <Sheet
              open
              onClose={() => setPmEdit(null)}
              title={<span className="icon-label"><FoodGlyph category={r.cat} size={18} compact /> {r.name[lang]} · {fmtDate(pmEdit.date, lang)}</span>}
            >
              <div className="flex flex-col gap-4 pb-2">
                <div className="flex items-center justify-between">
                  <span className="t-sub font-semibold">{t("plannedServings")}</span>
                  <Stepper
                    value={pm.servings}
                    onChange={(v) => updatePlannedMeal(pmEdit.date, pmEdit.slot, pmEdit.idx, v)}
                    step={0.5}
                    min={0.5}
                    format={(v) => `× ${v}`}
                  />
                </div>
                <div className="t-cap tabular text-center">
                  {fmtNum(r.perServing.cal * pm.servings)} {t("cal")} ·{" "}
                  {r.minutes} {t("minutes")}
                </div>
                <button
                  className="btn btn-primary press"
                  onClick={() => {
                    const xp = addLog({
                      date: pmEdit.date,
                      meal: pmEdit.slot,
                      name: r.name,
                      emoji: r.emoji,
                      macros: r.perServing,
                      src: "recipe",
                      refId: r.id,
                    });
                    toast(`${t("logged")}${xp > 0 ? ` · +${xp} XP` : ""}`, r.emoji);
                    setPmEdit(null);
                  }}
                >
                  <span className="icon-label"><AppIcon name="cutlery" size={18} /> {t("logToDiary")} (1 {t("serving")})</span>
                </button>
                <button
                  className="btn btn-ghost btn-danger press"
                  onClick={() => {
                    unplanMeal(pmEdit.date, pmEdit.slot, pmEdit.idx);
                    setPmEdit(null);
                  }}
                >
                  {t("delete")}
                </button>
              </div>
            </Sheet>
          );
        })()}
    </div>
  );
}

function RecipeQuickPick({ onPick }: { onPick: (r: Recipe) => void }) {
  const lang = useStore((s) => s.lang);
  const allRecipes = useStore((s) => s.recipes);
  const profile = useActiveProfile();
  const [q, setQ] = useState("");
  const recipes = selectedRecipesForProfile(profile, allRecipes);
  const list = q.trim()
    ? recipes.filter((r) => r.name.en.toLowerCase().includes(q.toLowerCase()) || r.name.zh.includes(q.trim()))
    : recipes;
  return (
    <div className="pb-2">
      <input className="field mb-3" placeholder={translate("searchFoodPh", lang)} value={q} onChange={(e) => setQ(e.target.value)} />
      <div>
        {list.length === 0 && <EmptyState icon="kitchen" title={lang === "zh" ? "還沒有加入食譜" : "No recipes added yet"} hint={lang === "zh" ? "先到食譜頁尋找並加入食譜。" : "Find and add recipes from the Recipes tab first."} />}
        {list.map((r) => (
          <button key={r.id} type="button" className="row row-button press cursor-pointer" onClick={() => onPick(r)}>
            <FoodGlyph category={r.cat} size={18} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ fontSize: 15 }}>{r.name[lang]}</div>
              <div className="t-cap tabular">{fmtNum(r.perServing.cal)} cal · {r.minutes}m</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================ GROCERIES ================================ */

function GroceriesTab() {
  const lang = useStore((s) => s.lang);
  const groceries = useStore((s) => s.groceries);
  const updateGrocery = useStore((s) => s.updateGrocery);
  const removeGrocery = useStore((s) => s.removeGrocery);
  const addGrocery = useStore((s) => s.addGrocery);
  const clearChecked = useStore((s) => s.clearCheckedGroceries);
  const t = (k: DictKey) => translate(k, lang);

  const [newName, setNewName] = useState("");

  const unchecked = groceries.filter((g) => !g.checked);
  const checked = groceries.filter((g) => g.checked);

  return (
    <div className="a-fadeUp">
      <div className="flex gap-2 mb-3">
        <input
          className="field flex-1"
          placeholder={t("addItem")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              addGrocery({ name: { en: newName.trim(), zh: newName.trim() }, qty: "", checked: false, cat: "other" });
              setNewName("");
            }
          }}
        />
        <button
          className="btn btn-primary press"
          onClick={() => {
            if (!newName.trim()) return;
            addGrocery({ name: { en: newName.trim(), zh: newName.trim() }, qty: "", checked: false, cat: "other" });
            setNewName("");
          }}
          aria-label={t("addItem")}
        >
          <AppIcon name="plus" size={18} />
        </button>
      </div>

      {groceries.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="shopping"
            title={t("groceryEmpty")}
            hint={lang === "zh" ? "手動新增，或從週計畫建立清單。" : "Add an item or build a list from Planner."}
          />
        </GlassCard>
      ) : (
        <>
          <GlassCard className="px-4 py-1 mb-3">
            {CAT_ORDER.map((cat) => {
              const items = unchecked.filter((g) => (g.cat ?? "other") === cat);
              if (items.length === 0) return null;
              const label = CAT_LABEL[cat];
              return (
                <div key={cat}>
                  <div className="t-cap font-bold pt-3" style={{ letterSpacing: 0.4 }}>
                    <span className="icon-label"><FoodGlyph category={cat} size={15} compact /> {label[lang]}</span>
                  </div>
                  {items.map((g) => (
                    <GroceryRow key={g.id} g={g} onToggle={() => updateGrocery(g.id, { checked: true })} onRemove={() => removeGrocery(g.id)} />
                  ))}
                </div>
              );
            })}
            {unchecked.length === 0 && <div className="t-sub text-center py-4 icon-label justify-center"><AppIcon name="checkCircle" size={17} /> {lang === "zh" ? "都買齊了！" : "All bought!"}</div>}
          </GlassCard>
          {checked.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="t-section icon-label"><AppIcon name="checkCircle" size={17} /> {checked.length}</div>
                <button className="chip press" onClick={clearChecked}>{t("clearChecked")}</button>
              </div>
              <GlassCard className="px-4 py-1 mb-3">
                {checked.map((g) => (
                  <GroceryRow key={g.id} g={g} done onToggle={() => updateGrocery(g.id, { checked: false })} onRemove={() => removeGrocery(g.id)} />
                ))}
              </GlassCard>
            </>
          )}
        </>
      )}
    </div>
  );
}

function GroceryRow({
  g,
  done = false,
  onToggle,
  onRemove,
}: {
  g: GroceryItem;
  done?: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const lang = useStore((s) => s.lang);
  return (
    <div className="row">
      <button
        className="press"
        onClick={onToggle}
        style={{
          width: 26,
          height: 26,
          borderRadius: 9,
          border: done ? "none" : "2px solid var(--ink-3)",
          background: done ? "linear-gradient(160deg,var(--cal-from),var(--cal-to))" : "transparent",
          color: "#fff",
          fontSize: 14,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {done ? <AppIcon name="check" size={17} /> : ""}
      </button>
      <div className="flex-1 min-w-0" style={{ opacity: done ? 0.55 : 1 }}>
        <div className="font-semibold truncate" style={{ fontSize: 15, textDecoration: done ? "line-through" : "none" }}>
          {g.name[lang] || g.name.en}
        </div>
        {g.qty && <div className="t-cap">{g.qty}</div>}
      </div>
      <button className="ibtn press" style={{ width: 30, height: 30, fontSize: 13, boxShadow: "none" }} onClick={onRemove}>
        <AppIcon name="close" size={16} />
      </button>
    </div>
  );
}
