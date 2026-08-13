"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveProfile, useStore, newId } from "@/lib/store";
import { BUILTIN_FOODS } from "@/lib/foods";
import { MEAL_ORDER, translate, type DictKey } from "@/lib/i18n";
import { fmtDate, todayStr } from "@/lib/dates";
import { fmtNum, mulMacros, sumMacros } from "@/lib/nutrition";
import { type FoodPhotoEstimate } from "@/lib/foodPhoto";
import { defaultMealByTime, parseVoiceFood, startRecognition, type RecognitionHandle } from "@/lib/voice";
import {
  MAX_VOICE_RECORDING_MS,
  preferredRecordingMimeType,
  recordingFileName,
  sanitizeTranscriptionKeywords,
} from "@/lib/transcription";
import { lookupBarcode } from "@/lib/off";
import { selectedRecipesForProfile } from "@/lib/onboarding";
import { searchFoodCatalog, type FoodSearchResult } from "@/lib/foodSearch";
import { resolveFoodServing } from "@/lib/foodServing";
import { recentFoodHistory } from "@/lib/recentFoods";
import {
  caloriesFromMacros,
  NUTRITION_UNITS,
  nutritionBasis,
  nutritionUnitLabel,
  nutritionUnitStep,
  routineMatches,
} from "@/lib/customRecipes";
import { melonCheer } from "@/lib/melonCheers";
import { DecimalInput, GlassCard, Sheet, toast, fireConfetti } from "@/components/ui";
import { AppIcon, FoodGlyph, MealGlyph, iconFromLegacy } from "@/components/icons";
import { AnimatedFoodHoney, isHoneyTheme } from "@/components/AnimatedFoodHoney";
import type { BiText, FoodItem, Lang, LogEntry, Macros, MealSlot, NutritionUnit, Recipe } from "@/lib/types";
import { apiFetch, isNativeApiOriginMissingError, nativeApiUnavailableMessage } from "@/lib/api";
import { successHaptic } from "@/lib/nativeApp";
import {
  beginVoiceCaptureSoundscape,
  endVoiceCaptureSoundscape,
  playSound,
} from "@/lib/soundscape";
import { runTestCommand } from "@/lib/testCommands";
import type { QuickLogMode } from "@/lib/quickLog";

type ReviewSource = "search" | "text" | "voice" | "photo" | "barcode" | "manual";

interface ReviewItem {
  name: BiText;
  emoji: string;
  qtyLabel: string;
  grams?: number;
  macros: Macros;
  refId?: string;
  /** Exact saved-recipe amount represented by `macros`. */
  amount?: number;
  amountUnit?: NutritionUnit;
}

interface FoodLogReview {
  id: string;
  source: ReviewSource;
  description: string;
  rationale: string;
  confidence: number;
  items: ReviewItem[];
}

interface TextEstimateResponse {
  estimate?: {
    description: string;
    rationale: string;
    confidence_score: number;
    items: {
      name: string;
      emoji: string;
      qty_label: string;
      grams: number | null;
      ref_id: string | null;
      cal: number;
      protein: number;
      carbs: number;
      fat: number;
    }[];
  };
  clarification?: string;
  error?: string;
  code?: string;
}

interface VoiceRecordingSession {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  cancelled: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

interface TranscriptionResponse {
  text?: string;
  error?: string;
  code?: string;
}

interface AnalyzeOutcome {
  ok: boolean;
  message?: string;
}

interface OnlineFoodResult {
  id: string;
  source: "Open Food Facts";
  name: string;
  brand?: string;
  serving: string;
  grams: number | null;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface OnlineFoodSearchResponse {
  results?: OnlineFoodResult[];
  error?: string;
}

class VoiceTranscriptionError extends Error {}

export default function AddPage() {
  return <Suspense fallback={null}><AddInner /></Suspense>;
}

function AddInner() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = useStore((state) => state.lang);
  const theme = useStore((state) => state.theme);
  const addLog = useStore((state) => state.addLog);
  const addCustomFood = useStore((state) => state.addCustomFood);
  const profileLogs = useStore((state) => state.logs[state.activeProfileId]);
  const profile = useActiveProfile();
  const customFoods = useStore((state) => state.customFoods);
  const allRecipes = useStore((state) => state.recipes);
  const foods = useMemo(() => [...customFoods, ...BUILTIN_FOODS], [customFoods]);
  const recipes = useMemo(() => selectedRecipesForProfile(profile, allRecipes), [allRecipes, profile]);
  const currentRecipeCatalog = useMemo(
    () => recipes.filter((recipe) => recipe.custom).map(recipeCandidateFromItem),
    [recipes]
  );
  const t = (key: DictKey) => translate(key, lang);

  const rawDate = params.get("date");
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr();
  const isToday = date === todayStr();
  const initialMeal = (params.get("meal") as MealSlot | null) ?? defaultMealByTime();
  const requestedCameraMode = params.get("mode");
  const requestedHoneyTheme = params.get("honeyTheme");
  const honeyThemePreview = isHoneyTheme(requestedHoneyTheme) ? requestedHoneyTheme : theme;

  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [input, setInput] = useState("");
  const [review, setReview] = useState<FoodLogReview | null>(null);
  const [searchReturnReview, setSearchReturnReview] = useState<FoodLogReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResultsMaxHeight, setSearchResultsMaxHeight] = useState<number>();
  const [onlineResults, setOnlineResults] = useState<OnlineFoodResult[]>([]);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<QuickLogMode>(params.get("mode") === "photo" ? "photo" : "scan");
  const [cameraOpen, setCameraOpen] = useState(params.get("mode") === "photo" || params.get("mode") === "scan");
  const [manualOpen, setManualOpen] = useState(params.get("mode") === "manual");
  const [recipeOpen, setRecipeOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => input.trim().length >= 2 ? searchFoodCatalog(input, foods, recipes, 10) : [],
    [foods, input, recipes]
  );
  const regularRecipes = useMemo(() => {
    const localDate = new Date(`${date}T12:00:00`);
    return recipes.filter((recipe) => recipe.custom && routineMatches(recipe, localDate, meal));
  }, [date, meal, recipes]);
  const savedRecipes = useMemo(() => recipes.filter((recipe) => recipe.custom), [recipes]);
  const recipeChoices = useMemo(() => {
    const regularIds = new Set(regularRecipes.map((recipe) => recipe.id));
    return [...regularRecipes, ...savedRecipes.filter((recipe) => !regularIds.has(recipe.id))];
  }, [regularRecipes, savedRecipes]);
  const hasSearchQuery = input.trim().length >= 2;
  const searchActive = searchFocused || hasSearchQuery;
  const recentEntries = useMemo(
    () => recentFoodHistory(profileLogs ?? []),
    [profileLogs]
  );

  useEffect(() => {
    if (requestedCameraMode !== "scan" && requestedCameraMode !== "photo") return;
    setCameraMode(requestedCameraMode);
    setCameraOpen(true);
  }, [requestedCameraMode]);

  useEffect(() => {
    if (!searchActive || (results.length === 0 && onlineResults.length === 0 && !onlineBusy)) {
      setSearchResultsMaxHeight(undefined);
      return;
    }

    const viewport = window.visualViewport;
    const updateMaxHeight = () => {
      const list = searchResultsRef.current;
      if (!list) return;
      const visibleBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      setSearchResultsMaxHeight(Math.max(88, Math.floor(visibleBottom - list.getBoundingClientRect().top - 12)));
    };

    const frame = requestAnimationFrame(updateMaxHeight);
    viewport?.addEventListener("resize", updateMaxHeight);
    viewport?.addEventListener("scroll", updateMaxHeight);
    window.addEventListener("resize", updateMaxHeight);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", updateMaxHeight);
      viewport?.removeEventListener("scroll", updateMaxHeight);
      window.removeEventListener("resize", updateMaxHeight);
    };
  }, [onlineBusy, onlineResults.length, results.length, searchActive]);

  const cancelSearch = () => {
    setInput("");
    setError("");
    setOnlineResults([]);
    setOnlineError("");
    setSearchFocused(false);
    searchInputRef.current?.blur();
    if (searchReturnReview) setReview(searchReturnReview);
    setSearchReturnReview(null);
  };

  const reviewCatalogResult = (result: FoodSearchResult) => {
    setError("");
    searchInputRef.current?.blur();
    setInput("");
    setSearchFocused(false);
    setOnlineResults([]);
    setOnlineError("");
    setSearchReturnReview(null);
    setReview(result.kind === "food"
      ? reviewFromFood(result.item, "search", lang, result.matchedOn)
      : reviewFromRecipe(result.item, "search", lang, result.matchedOn));
  };

  const reviewRecentEntry = (entry: LogEntry) => {
    setInput("");
    setSearchFocused(false);
    searchInputRef.current?.blur();
    setOnlineResults([]);
    setOnlineError("");
    setSearchReturnReview(null);
    setReview(reviewFromRecentLog(entry, lang));
  };

  const searchOnlineCatalog = async () => {
    const query = input.trim();
    if (query.length < 2 || onlineBusy) return;
    setOnlineBusy(true);
    setOnlineError("");
    try {
      const response = await apiFetch(`/api/food-search?query=${encodeURIComponent(query)}`);
      const data = (await response.json()) as OnlineFoodSearchResponse;
      if (!response.ok) throw new Error(data.error || "Online food search failed.");
      if (searchInputRef.current?.value.trim() !== query) return;
      setOnlineResults(data.results ?? []);
      if (!data.results?.length) {
        setOnlineError(lang === "zh" ? "線上商品目錄也找不到相符項目。" : "No matching products were found online either.");
      }
    } catch (caught) {
      setOnlineError(isNativeApiOriginMissingError(caught)
        ? (lang === "zh" ? "連接伺服器後才能搜尋線上商品目錄。" : "Connect the app to its server to search the online product catalog.")
        : caught instanceof Error ? caught.message : (lang === "zh" ? "暫時無法搜尋線上商品目錄。" : "The online product catalog is temporarily unavailable."));
    } finally {
      setOnlineBusy(false);
    }
  };

  const reviewOnlineResult = (result: OnlineFoodResult) => {
    const item = foodFromOnlineResult(result);
    if (!customFoods.some((food) => food.id === item.id)) addCustomFood(item);
    reviewCatalogResult({ kind: "food", item, score: 180, matchedOn: result.source });
  };

  const analyzeText = async (raw: string, source: "text" | "voice"): Promise<AnalyzeOutcome> => {
    const note = raw.trim();
    if (!note || busy) return { ok: false, message: lang === "zh" ? "請說出你吃了什麼。" : "Tell me what you ate." };
    setBusy(true);
    setError("");
    const localHits = parseVoiceFood(note, foods, recipes, lang);
    if (hasTrustworthyCatalogMatches(note, localHits.map((hit) => hit.refId), foods, recipes)) {
      setReview({
        id: newId(),
        source,
        description: localHits.map((hit) => `${hit.qtyLabel} ${hit.name[lang] || hit.name.en}`).join(" · "),
        rationale: lang === "zh"
          ? "已比對你的食材與自訂食譜，並依照資料庫中的份量計算營養。"
          : "Matched against your ingredient and saved-recipe catalog, then scaled the stored nutrition to the amount you gave.",
        confidence: 96,
        items: localHits.map((hit) => ({
          name: hit.name,
          emoji: hit.emoji || "🍽️",
          qtyLabel: hit.qtyLabel,
          grams: hit.grams,
          amount: hit.amount,
          amountUnit: hit.amountUnit,
          macros: hit.macros,
          refId: hit.refId,
        })),
      });
      setBusy(false);
      return { ok: true };
    }

    try {
      const candidates = catalogCandidatesForNote(note, foods, recipes);
      const response = await apiFetch("/api/food-text-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note, lang, catalog: candidates, recipeCatalog: currentRecipeCatalog }),
      });
      const data = (await response.json()) as TextEstimateResponse;
      if (response.ok && data.clarification) {
        setReview(null);
        if (source === "text") setError(data.clarification);
        return { ok: false, message: data.clarification };
      }
      if (!response.ok || !data.estimate) {
        throw new Error(
          data.code === "AI_NOT_CONFIGURED"
            ? lang === "zh" ? "找不到相符項目。請搜尋食材或在「餐點」建立自訂食譜。" : "No catalog match. Search an ingredient or create a custom recipe in Meal."
            : data.error || (lang === "zh" ? "暫時無法分析這筆飲食。" : "That food note could not be analyzed.")
        );
      }
      setReview({
        id: newId(),
        source,
        description: data.estimate.description,
        rationale: data.estimate.rationale,
        confidence: data.estimate.confidence_score,
        items: data.estimate.items.map((item) => ({
          name: { en: item.name, zh: item.name },
          emoji: item.emoji || "🍽️",
          qtyLabel: item.qty_label,
          grams: item.grams ?? undefined,
          refId: item.ref_id ?? undefined,
          macros: { cal: item.cal, protein: item.protein, carbs: item.carbs, fat: item.fat },
        })),
      });
      return { ok: true };
    } catch (caught) {
      const message = isNativeApiOriginMissingError(caught)
        ? nativeApiUnavailableMessage(lang, "text")
        : caught instanceof Error
          ? caught.message
          : lang === "zh" ? "暫時無法分析這筆飲食。" : "That food note could not be analyzed.";
      if (source === "text") setError(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  };

  const confirmReview = (adjustedItems: ReviewItem[], selectedMeal: MealSlot) => {
    let xp = 0;
    const recipeIds = new Set(recipes.map((recipe) => recipe.id));
    for (const item of adjustedItems) {
      const source = review?.source === "photo" ? "photo"
        : review?.source === "barcode" ? "barcode"
          : review?.source === "voice" ? "voice"
            : review?.source === "manual" ? "manual"
              : recipeIds.has(item.refId ?? "") ? "recipe"
                : review?.source === "search" ? "food" : "text";
      xp += addLog({
        date,
        meal: selectedMeal,
        name: item.name,
        emoji: item.emoji,
        grams: item.grams,
        amount: item.amount,
        amountUnit: item.amountUnit,
        macros: item.macros,
        src: source,
        refId: item.refId,
      });
    }
    fireConfetti();
    void successHaptic();
    toast(`${melonCheer(lang)}${xp > 0 ? ` · +${xp} XP` : ""}`, "fruit");
    setReview(null);
    setInput("");
  };

  return (
    <main className={`page log-food-page ${searchActive && !review ? "is-searching" : ""}`}>
      <header className="flex items-center justify-between mb-3">
        <div>
          <h1 className="t-title icon-label"><AppIcon name="plus" size={22} /> {t("logMeal")}</h1>
          {!isToday && <div className="t-cap mt-1 icon-label"><AppIcon name="calendar" size={14} /> {fmtDate(date, lang)}</div>}
        </div>
        <button className="chip press" onClick={() => router.back()}>{t("done")}</button>
      </header>

      <div className={`log-food-stage ${searchActive && !review ? "is-searching" : ""}`}>
        <AnimatedFoodHoney theme={honeyThemePreview} />
        <GlassCard strong className="log-food-console">
          <p className="log-food-intro">
            {lang === "zh" ? "搜尋特定食物，或從下方選擇快速記錄方式。" : "Search for something specific, or choose a quick option below."}
          </p>
          <div className="food-composer">
            <AppIcon name="search" size={20} />
            <input
              ref={searchInputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={input}
              onChange={(event) => {
                const nextInput = event.target.value;
                setInput(nextInput);
                if (nextInput.trim() && review) {
                  setSearchReturnReview(review);
                  setReview(null);
                } else if (!nextInput.trim() && searchReturnReview) {
                  setReview(searchReturnReview);
                  setSearchReturnReview(null);
                }
                setError("");
                setOnlineResults([]);
                setOnlineError("");
              }}
              onFocus={() => {
                setSearchFocused(true);
                if (review) {
                  setSearchReturnReview(review);
                  setReview(null);
                }
              }}
              onBlur={() => {
                setSearchFocused(false);
                if (input.trim().length < 2 && searchReturnReview) {
                  setInput("");
                  setReview(searchReturnReview);
                  setSearchReturnReview(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelSearch();
                  return;
                }
                if (event.key !== "Enter") return;
                event.preventDefault();
                const command = process.env.NODE_ENV === "development"
                  ? runTestCommand(input)
                  : { matched: false as const };
                if (command.matched) {
                  if (command.ok) {
                    cancelSearch();
                    toast(command.message, "checkCircle");
                  } else {
                    setError(command.message);
                  }
                  return;
                }
                if (results[0]) reviewCatalogResult(results[0]);
                else void searchOnlineCatalog();
              }}
              placeholder={lang === "zh" ? "搜尋食物或已儲存食譜" : "Search foods or saved recipes"}
              aria-label={lang === "zh" ? "搜尋食物或已儲存食譜" : "Search foods or saved recipes"}
            />
            {input && (
              <button
                type="button"
                className="food-composer-clear press"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (searchReturnReview) {
                    cancelSearch();
                    return;
                  }
                  setInput("");
                  setError("");
                  setOnlineResults([]);
                  setOnlineError("");
                  searchInputRef.current?.focus();
                }}
                aria-label={lang === "zh" ? "清除搜尋" : "Clear search"}
              >
                <AppIcon name="close" size={18} />
              </button>
            )}
          </div>

          {!review && searchActive && (
            <div className="food-search-panel" aria-live="polite">
              <div className="food-search-heading food-search-heading-with-back">
                <button
                  type="button"
                  className="food-search-back press"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={cancelSearch}
                  aria-label={searchReturnReview
                    ? (lang === "zh" ? `返回 ${searchReturnReview.description}` : `Back to ${searchReturnReview.description}`)
                    : (lang === "zh" ? "返回" : "Back")}
                >
                  <AppIcon name="back" size={14} />
                  {lang === "zh" ? "返回" : "Back"}
                </button>
                <b>{hasSearchQuery ? (lang === "zh" ? "搜尋結果" : "Search results") : (lang === "zh" ? "最近記錄" : "Recent foods")}</b>
                <span>{hasSearchQuery ? results.length + onlineResults.length : recentEntries.length}</span>
              </div>
              <div
                ref={searchResultsRef}
                className="food-search-results"
                style={searchResultsMaxHeight ? { maxHeight: `${searchResultsMaxHeight}px` } : undefined}
              >
                {!hasSearchQuery ? (
                  recentEntries.length > 0 ? recentEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="row row-button press"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => reviewRecentEntry(entry)}
                    >
                      <AppIcon name={iconFromLegacy(entry.emoji, "cutlery")} size={19} />
                      <span className="flex-1 min-w-0">
                        <b className="block truncate">{entry.name[lang] || entry.name.en}</b>
                        <small className="t-cap">{recentLogAmountLabel(entry, lang)} · {t(entry.meal as DictKey)} · {fmtNum(entry.macros.cal)} cal</small>
                      </span>
                      <AppIcon name="next" size={17} />
                    </button>
                  )) : (
                    <p className="food-search-empty">
                      {lang === "zh" ? "完成第一筆飲食記錄後，最近食物會顯示在這裡。" : "Your recent foods will appear here after your first log."}
                    </p>
                  )
                ) : results.length > 0 ? (
                  results.map((result) => (
                    <button key={`${result.kind}-${result.item.id}`} type="button" className="row row-button press" onClick={() => reviewCatalogResult(result)}>
                      <FoodGlyph category={result.item.cat} size={19} />
                      <span className="flex-1 min-w-0">
                        <b className="block truncate">{result.item.name[lang] || result.item.name.en}</b>
                        <small className="t-cap">{result.matchedOn} · {searchResultNutrition(result, lang)}</small>
                      </span>
                      <AppIcon name="next" size={17} />
                    </button>
                  ))
                ) : !onlineResults.length && (
                  <p className="food-search-empty">
                    {lang === "zh" ? "本機目錄找不到相符項目。" : "No matching item in the offline catalog."}
                  </p>
                )}
                {hasSearchQuery && onlineResults.length > 0 && (
                  <>
                    <div className="food-online-heading">{lang === "zh" ? "線上商品" : "Online products"}</div>
                    {onlineResults.map((result) => (
                      <button key={result.id} type="button" className="row row-button press" onClick={() => reviewOnlineResult(result)}>
                        <AppIcon name="package" size={19} />
                        <span className="flex-1 min-w-0">
                          <b className="block truncate">{result.name}</b>
                          <small className="t-cap">{result.brand ? `${result.brand} · ` : ""}{result.serving} · {fmtNum(result.cal)} cal</small>
                        </span>
                        <AppIcon name="next" size={17} />
                      </button>
                    ))}
                  </>
                )}
                {hasSearchQuery && onlineError && <p className="food-online-error" role="status">{onlineError}</p>}
                {hasSearchQuery && <div className="food-online-action">
                  <button type="button" className="btn btn-ghost press" disabled={onlineBusy} onClick={() => void searchOnlineCatalog()}>
                    <AppIcon name={onlineBusy ? "refresh" : "search"} size={17} className={onlineBusy ? "a-spin" : ""} />
                    {onlineBusy
                      ? (lang === "zh" ? "正在搜尋線上目錄…" : "Searching online catalog…")
                      : onlineResults.length
                        ? (lang === "zh" ? "重新搜尋線上商品" : "Refresh online products")
                        : (lang === "zh" ? "搜尋線上商品目錄" : "Search online products")}
                  </button>
                  <small>{lang === "zh" ? "商品資料來自 Open Food Facts；選取後會存到你的食物。" : "Products come from Open Food Facts and are saved to My foods when selected."}</small>
                </div>}
              </div>
            </div>
          )}
          {!searchActive && <div className="log-food-actions">
            <button className="log-food-action press" onClick={() => { setCameraMode("scan"); setCameraOpen(true); }}>
              <span><AppIcon name="camera" size={22} /></span>
              <b>{lang === "zh" ? "相機" : "Camera"}</b>
              <small>{lang === "zh" ? "拍攝食物、營養標示或掃描條碼" : "Photograph food or a nutrition label, or scan a barcode"}</small>
            </button>
            <button
              className="log-food-action log-food-talk press"
              onClick={() => { setError(""); setVoiceOpen(true); }}
              disabled={busy}
            >
              <span><AppIcon name="microphone" size={22} /></span>
              <b>{lang === "zh" ? "自然地告訴 AI" : "Talk naturally to AI"}</b>
              <small>{lang === "zh" ? "例如：兩顆蛋和一份酪梨吐司" : "Say, for example: 2 large eggs and 1 avocado toast"}</small>
            </button>
            <button className="log-food-action log-food-custom press" onClick={() => setManualOpen(true)}>
              <span><AppIcon name="manual" size={22} /></span>
              <b>{lang === "zh" ? "自訂" : "Custom"}</b>
              <small>{lang === "zh" ? "自行輸入熱量與營養資料" : "Enter calories and nutrition yourself"}</small>
            </button>
            <button className="log-food-action log-food-recipe press" onClick={() => setRecipeOpen(true)}>
              <span><AppIcon name="kitchen" size={22} /></span>
              <b>{lang === "zh" ? "食譜" : "Recipe"}</b>
              <small>{lang === "zh" ? "將多種食材組合成可重複使用的餐點" : "Combine ingredients into one reusable meal"}</small>
            </button>
          </div>}
        </GlassCard>
      </div>

      {error && <div className="target-error mt-3" role="alert">{error}</div>}

      {review && (
        <FoodReviewCard
          key={review.id}
          review={review}
          initialMeal={meal}
          lang={lang}
          onMealChange={setMeal}
          onBack={() => { setReview(null); setSearchReturnReview(null); }}
          onConfirm={confirmReview}
        />
      )}

      <CameraSheet mode={cameraMode} onModeChange={setCameraMode} open={cameraOpen} lang={lang} onClose={() => setCameraOpen(false)} onReview={(next) => { setCameraOpen(false); setReview(next); }} />
      <VoiceSheet
        open={voiceOpen}
        lang={lang}
        onClose={() => setVoiceOpen(false)}
        onAnalyze={(transcript) => analyzeText(transcript, "voice")}
        onComplete={() => setVoiceOpen(false)}
      />
      <Sheet
        open={recipeOpen}
        onClose={() => setRecipeOpen(false)}
        title={<span className="icon-label"><AppIcon name="kitchen" size={20} /> {lang === "zh" ? "食譜" : "Recipes"}</span>}
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="t-sub">
            {lang === "zh" ? "你想記錄已儲存的食譜，還是加入食材建立新食譜？" : "Would you like to log a saved recipe, or add ingredients to a new one?"}
          </p>
          <button
            type="button"
            className="row row-button press"
            onClick={() => {
              setRecipeOpen(false);
              router.push("/kitchen#create-recipe");
            }}
          >
            <AppIcon name="plus" size={20} />
            <span className="min-w-0 flex-1">
              <b>{lang === "zh" ? "建立新食譜" : "Create a new recipe"}</b>
              <small>{lang === "zh" ? "加入食材並儲存每份營養" : "Add ingredients and save nutrition per serving"}</small>
            </span>
            <AppIcon name="next" size={17} />
          </button>
          {recipeChoices.length > 0 && (
            <div className="food-quick-recipes">
              <div className="food-search-heading">
                <b>{lang === "zh" ? "已儲存食譜" : "Saved recipes"}</b>
                <span>{recipeChoices.length}</span>
              </div>
              <div className="food-quick-recipe-grid">
                {recipeChoices.map((recipe) => {
                  const basis = nutritionBasis(recipe);
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      className="food-quick-recipe press"
                      onClick={() => {
                        setRecipeOpen(false);
                        reviewCatalogResult({ kind: "recipe", item: recipe, score: 160, matchedOn: lang === "zh" ? "我的食譜" : "My recipe" });
                      }}
                    >
                      <span><AppIcon name={iconFromLegacy(recipe.emoji, "cutlery")} size={19} /></span>
                      <b>{recipe.name[lang] || recipe.name.en}</b>
                      <small>{fmtNum(recipe.perServing.cal)} cal / {formatAmount(basis.amount)} {nutritionUnitLabel(basis.unit, basis.amount, lang)}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Sheet>
      <ManualFoodSheet open={manualOpen} lang={lang} onClose={() => setManualOpen(false)} onReview={(next) => { setManualOpen(false); setReview(next); }} />
    </main>
  );
}

function FoodReviewCard({
  review,
  initialMeal,
  lang,
  onMealChange,
  onBack,
  onConfirm,
}: {
  review: FoodLogReview;
  initialMeal: MealSlot;
  lang: Lang;
  onMealChange: (meal: MealSlot) => void;
  onBack: () => void;
  onConfirm: (items: ReviewItem[], meal: MealSlot) => void;
}) {
  const [meal, setMeal] = useState(initialMeal);
  const [amounts, setAmounts] = useState(() => review.items.map((item) => item.amount ?? 1));
  const measuredItem = review.items.length === 1 && review.items[0].amount && review.items[0].amountUnit ? review.items[0] : null;
  const initialAmount = measuredItem?.amount ?? 1;
  const amount = amounts[0] ?? initialAmount;
  const setAmount = (value: number | ((current: number) => number)) => setAmounts((current) => {
    const next = [...current];
    next[0] = typeof value === "function" ? value(next[0] ?? initialAmount) : value;
    return next;
  });
  const factor = measuredItem ? amount / initialAmount : amount;
  const amountStep = measuredItem ? nutritionUnitStep(measuredItem.amountUnit as NutritionUnit) : 0.5;
  const adjustedItems = review.items.map((item, index) => {
    const itemAmount = amounts[index] ?? item.amount ?? 1;
    const itemFactor = review.items.length === 1
      ? factor
      : itemAmount / (item.amount ?? 1);
    return {
      ...item,
      grams: item.amountUnit === "g"
        ? itemAmount
        : item.grams == null ? undefined : Math.round(item.grams * itemFactor * 10) / 10,
      amount: item.amountUnit ? itemAmount : item.amount,
      macros: mulMacros(item.macros, itemFactor),
    };
  });
  const adjusted = sumMacros(adjustedItems.map((item) => item.macros));
  const confidenceTone = review.confidence >= 80 ? "high" : review.confidence < 50 ? "low" : "medium";

  const chooseMeal = (next: MealSlot) => {
    setMeal(next);
    onMealChange(next);
  };

  return (
    <GlassCard className="food-review-card p-4 mt-4 a-fadeUp">
      <div className="food-review-heading">
        <div>
          <div className="t-section">{lang === "zh" ? "確認這筆記錄" : "Confirm this log"}</div>
          <p>{review.description}</p>
        </div>
        <span className={`confidence confidence-${confidenceTone}`} aria-label={`${review.confidence}% confidence`}>
          {review.confidence}%<small>{lang === "zh" ? "信心" : "confidence"}</small>
        </span>
      </div>

      <div className="food-review-items">
        {adjustedItems.map((item, index) => {
          const original = review.items[index];
          const itemAmount = amounts[index] ?? original.amount ?? 1;
          const itemStep = original.amountUnit ? nutritionUnitStep(original.amountUnit as NutritionUnit) : 0.5;
          return (
          <div className="food-review-item" key={`${item.refId ?? item.name.en}-${index}`}>
            <span><AppIcon name={iconFromLegacy(item.emoji, "cutlery")} size={20} /></span>
            <div className="flex-1 min-w-0">
              <b>{item.name[lang] || item.name.en}</b>
              <small>{original.amountUnit
                ? `${formatAmount(itemAmount)} ${nutritionUnitLabel(original.amountUnit, itemAmount, lang)}`
                : scaledServingLabel(original, itemAmount, lang)}</small>
              {review.items.length > 1 && (
                <div className="food-review-item-serving">
                  <button type="button" className="ibtn press" onClick={() => setAmounts((current) => current.map((value, itemIndex) => itemIndex === index ? Math.max(itemStep, Math.round((value - itemStep) * 100) / 100) : value))} disabled={itemAmount <= itemStep} aria-label={lang === "zh" ? `減少 ${item.name[lang] || item.name.en}` : `Decrease ${item.name.en}`}><AppIcon name="minus" size={14} /></button>
                  <DecimalInput className="" min={0.01} value={itemAmount} onChange={(value) => setAmounts((current) => current.map((saved, itemIndex) => itemIndex === index ? value : saved))} ariaLabel={lang === "zh" ? `${item.name[lang] || item.name.en} 食用量` : `${item.name.en} amount`} />
                  <button type="button" className="ibtn press" onClick={() => setAmounts((current) => current.map((value, itemIndex) => itemIndex === index ? Math.round((value + itemStep) * 100) / 100 : value))} aria-label={lang === "zh" ? `增加 ${item.name[lang] || item.name.en}` : `Increase ${item.name.en}`}><AppIcon name="plus" size={14} /></button>
                </div>
              )}
            </div>
            <strong>{fmtNum(item.macros.cal)} cal</strong>
          </div>
          );
        })}
      </div>

      <div className="food-rationale"><AppIcon name="idea" size={18} /><span><b>{lang === "zh" ? "計算依據" : "Why this estimate"}</b>{review.rationale}</span></div>

      {review.items.length === 1 && <div className="food-serving-editor mt-4">
        <label>{measuredItem ? (lang === "zh" ? "食用量" : "Amount eaten") : (lang === "zh" ? "份數" : "Servings")}</label>
        <div className="food-serving-controls">
          <button type="button" className="ibtn press" onClick={() => setAmount((value) => Math.max(amountStep, Math.round((value - amountStep) * 100) / 100))} disabled={amount <= amountStep} aria-label={lang === "zh" ? "減少份量" : "Decrease amount"}><AppIcon name="minus" size={18} /></button>
          <div className="food-serving-value" aria-live="polite">
            <DecimalInput className="" min={0.01} value={amount} onChange={setAmount} ariaLabel={lang === "zh" ? "食用量" : "Amount eaten"} />
            <span>{measuredItem?.amountUnit ? nutritionUnitLabel(measuredItem.amountUnit, amount, lang) : (lang === "zh" ? "份" : amount === 1 ? "serving" : "servings")}</span>
          </div>
          <button type="button" className="ibtn press" onClick={() => setAmount((value) => Math.round((value + amountStep) * 100) / 100)} aria-label={lang === "zh" ? "增加份量" : "Increase amount"}><AppIcon name="plus" size={18} /></button>
        </div>
        <div className="food-serving-basis">{measuredItem?.amountUnit ? (lang === "zh" ? `營養資料以每 ${formatAmount(initialAmount)} ${nutritionUnitLabel(measuredItem.amountUnit, initialAmount, lang)} 計算` : `Nutrition saved per ${formatAmount(initialAmount)} ${nutritionUnitLabel(measuredItem.amountUnit, initialAmount, lang)}`) : servingBasisLabel(review.items[0], lang)}</div>
      </div>}

      <div className="nutrition-details tabular mt-3"><span>P {fmtNum(adjusted.protein)}g</span><span>C {fmtNum(adjusted.carbs)}g</span><span>F {fmtNum(adjusted.fat)}g</span></div>
      <div className="mt-3"><MealPick slot={meal} setSlot={chooseMeal} lang={lang} /></div>
      <div className="flex gap-2 mt-3">
        <button className="btn btn-ghost press" onClick={onBack}>{lang === "zh" ? "返回" : "Back"}</button>
        <button className="btn btn-primary press flex-1" onClick={() => onConfirm(adjustedItems, meal)}><AppIcon name="checkCircle" size={18} /> {lang === "zh" ? "確認並記錄" : "Confirm & log"}</button>
      </div>
    </GlassCard>
  );
}

function MealPick({ slot, setSlot, lang }: { slot: MealSlot; setSlot: (slot: MealSlot) => void; lang: Lang }) {
  return (
    <div className="seg w-full">
      {MEAL_ORDER.map((meal) => (
        <button key={meal} className={`seg-item ${slot === meal ? "on" : ""}`} onClick={() => setSlot(meal)} aria-label={translate(meal as DictKey, lang)} aria-pressed={slot === meal}>
          <MealGlyph meal={meal} size={17} />
        </button>
      ))}
    </div>
  );
}

type VoiceSheetStatus = "starting" | "listening" | "transcribing" | "analyzing" | "error";

function VoiceSheet({
  open,
  lang,
  onClose,
  onAnalyze,
  onComplete,
}: {
  open: boolean;
  lang: Lang;
  onClose: () => void;
  onAnalyze: (transcript: string) => Promise<AnalyzeOutcome>;
  onComplete: () => void;
}) {
  const customFoods = useStore((state) => state.customFoods);
  const allRecipes = useStore((state) => state.recipes);
  const voiceKeywords = useMemo(() => sanitizeTranscriptionKeywords([
    ...customFoods.flatMap((food) => [food.name.en, food.name.zh]),
    ...allRecipes.flatMap((recipe) => [recipe.name.en, recipe.name.zh]),
  ]), [allRecipes, customFoods]);
  const controlsRef = useRef<{ stop: () => void; cancel: () => void } | null>(null);
  const onAnalyzeRef = useRef(onAnalyze);
  const onCompleteRef = useRef(onComplete);
  const [status, setStatus] = useState<VoiceSheetStatus>("starting");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { onAnalyzeRef.current = onAnalyze; }, [onAnalyze]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    if (!open) return;
    beginVoiceCaptureSoundscape();
    let active = true;
    let handled = false;
    let recorderSession: VoiceRecordingSession | null = null;
    let recognition: RecognitionHandle | null = null;
    let fallbackTranscript = "";

    setStatus("starting");
    setMessage("");

    const fail = (nextMessage: string) => {
      if (!active) return;
      handled = true;
      setStatus("error");
      setMessage(nextMessage);
    };

    const finishAnalysis = async (transcript: string) => {
      if (!active || handled) return;
      handled = true;
      const note = transcript.trim();
      if (!note) {
        fail(lang === "zh" ? "沒有偵測到語音，請再試一次。" : "No speech was detected. Please try again.");
        return;
      }
      setStatus("analyzing");
      const outcome = await onAnalyzeRef.current(note);
      if (!active) return;
      if (outcome.ok) {
        onCompleteRef.current();
      } else {
        setStatus("error");
        setMessage(outcome.message || (lang === "zh" ? "無法辨識這筆飲食，請再試一次。" : "I couldn't resolve that food. Please try again."));
      }
    };

    const transcribe = async (blob: Blob) => {
      if (!active) return;
      if (!blob.size) {
        fail(lang === "zh" ? "沒有偵測到語音，請再試一次。" : "No speech was recorded. Please try again.");
        return;
      }
      setStatus("transcribing");
      try {
        const form = new FormData();
        form.append("file", blob, recordingFileName(blob.type));
        form.append("keywords", JSON.stringify(voiceKeywords));
        const response = await apiFetch("/api/food-transcribe", { method: "POST", body: form });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          throw new VoiceTranscriptionError(response.status === 404
            ? lang === "zh" ? "語音服務尚未部署到目前的伺服器。請更新伺服器後再試一次。" : "Voice transcription is not deployed on the configured server yet. Deploy the latest server and try again."
            : lang === "zh" ? "語音服務傳回了無效的回應，請再試一次。" : "The voice service returned an invalid response. Please try again.");
        }
        let data: TranscriptionResponse;
        try {
          data = (await response.json()) as TranscriptionResponse;
        } catch {
          throw new VoiceTranscriptionError(lang === "zh" ? "語音服務傳回了無效的回應，請再試一次。" : "The voice service returned an invalid response. Please try again.");
        }
        if (!response.ok || !data.text?.trim()) {
          throw new VoiceTranscriptionError(
            data.code === "AI_NOT_CONFIGURED"
              ? lang === "zh" ? "AI 語音辨識尚未設定，你仍可直接輸入食物。" : "AI voice recognition is not configured yet. You can still type your food."
              : data.error || (lang === "zh" ? "暫時無法辨識這段語音，請再試一次。" : "That recording could not be transcribed. Please try again.")
          );
        }
        await finishAnalysis(data.text);
      } catch (caught) {
        fail(isNativeApiOriginMissingError(caught)
          ? nativeApiUnavailableMessage(lang, "text")
          : caught instanceof VoiceTranscriptionError
            ? caught.message
            : lang === "zh" ? "暫時無法辨識這段語音，請再試一次。" : "That recording could not be transcribed. Please try again.");
      }
    };

    const startFallback = () => {
      recognition = startRecognition(
        lang,
        (transcript) => { fallbackTranscript = transcript; },
        () => {
          recognition = null;
          if (!active || handled) return;
          void finishAnalysis(fallbackTranscript);
        }
      );
      if (!recognition) {
        fail(lang === "zh" ? "此裝置無法使用語音輸入，你仍可直接輸入。" : "Voice input is unavailable here. You can still type your food.");
        return;
      }
      controlsRef.current = {
        stop: () => recognition?.stop(),
        cancel: () => { active = false; recognition?.stop(); recognition = null; },
      };
      setStatus("listening");
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        startFallback();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const mimeType = preferredRecordingMimeType();
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        } catch {
          stream.getTracks().forEach((track) => track.stop());
          startFallback();
          return;
        }
        const session: VoiceRecordingSession = { recorder, stream, chunks: [], cancelled: false, timer: null };
        recorderSession = session;
        const release = () => {
          if (session.timer) clearTimeout(session.timer);
          stream.getTracks().forEach((track) => track.stop());
          if (recorderSession === session) recorderSession = null;
        };
        recorder.ondataavailable = (event) => {
          if (event.data.size) session.chunks.push(event.data);
        };
        recorder.onerror = () => {
          session.cancelled = true;
          release();
          fail(lang === "zh" ? "錄音中斷了，請再試一次。" : "The recording was interrupted. Please try again.");
        };
        recorder.onstop = () => {
          release();
          if (!active || session.cancelled) return;
          const recordingType = recorder.mimeType || mimeType || session.chunks[0]?.type || "audio/webm";
          void transcribe(new Blob(session.chunks, { type: recordingType }));
        };
        controlsRef.current = {
          stop: () => { if (recorder.state !== "inactive") recorder.stop(); },
          cancel: () => {
            active = false;
            session.cancelled = true;
            if (recorder.state !== "inactive") recorder.stop();
            release();
          },
        };
        recorder.start();
        session.timer = setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, MAX_VOICE_RECORDING_MS);
        setStatus("listening");
      } catch (caught) {
        fail(caught instanceof DOMException && caught.name === "NotAllowedError"
          ? lang === "zh" ? "請允許麥克風權限後再試一次。" : "Please allow microphone access and try again."
          : lang === "zh" ? "無法開啟麥克風，你仍可直接輸入。" : "The microphone could not be opened. You can still type your food.");
      }
    };

    void start();
    return () => {
      active = false;
      controlsRef.current?.cancel();
      controlsRef.current = null;
      recognition?.stop();
      if (recorderSession) {
        recorderSession.cancelled = true;
        if (recorderSession.timer) clearTimeout(recorderSession.timer);
        recorderSession.stream.getTracks().forEach((track) => track.stop());
        if (recorderSession.recorder.state !== "inactive") recorderSession.recorder.stop();
      }
      endVoiceCaptureSoundscape();
    };
  }, [attempt, lang, open, voiceKeywords]);

  const processing = status === "transcribing" || status === "analyzing";
  const requestClose = () => {
    if (processing) return;
    controlsRef.current?.cancel();
    controlsRef.current = null;
    onClose();
  };
  const retry = () => {
    controlsRef.current?.cancel();
    controlsRef.current = null;
    setAttempt((value) => value + 1);
  };

  const heading = status === "listening"
    ? (lang === "zh" ? "AI 正在聆聽" : "AI is listening")
    : status === "transcribing"
      ? (lang === "zh" ? "正在理解你的語音" : "Understanding what you said")
      : status === "analyzing"
        ? (lang === "zh" ? "正在尋找食物與營養" : "Finding foods and nutrition")
        : status === "error"
          ? (lang === "zh" ? "再試一次" : "Let’s try that again")
          : (lang === "zh" ? "正在準備麥克風" : "Getting the microphone ready");

  return (
    <Sheet open={open} onClose={requestClose} title={<span className="icon-label"><AppIcon name="microphone" size={20} /> {lang === "zh" ? "自然地告訴 AI" : "Talk naturally to AI"}</span>}>
      <div className={`voice-ai-sheet voice-ai-${status}`}>
        <div className="voice-ai-orb" aria-hidden="true">
          <span />
          <AppIcon name={processing ? "magic" : status === "error" ? "warning" : "microphone"} size={42} />
        </div>
        <div className="voice-ai-copy" role="status" aria-live="polite">
          <h2>{heading}</h2>
          <p>{status === "listening"
            ? (lang === "zh" ? "自然說出所有食物和份量，說完後按下停止。" : "Say all your foods and portions naturally, then press Stop when you’re done.")
            : processing
              ? (lang === "zh" ? "AI 正在比對食物資料庫與食譜，可能需要幾秒鐘。" : "AI is matching your foods against the catalog and recipes. This may take a few seconds.")
              : status === "error"
                ? message
                : (lang === "zh" ? "支援中文、英文或混合語句。" : "You can speak in English, Chinese, or both.")}</p>
        </div>
        {status === "listening" && (
          <button type="button" className="btn voice-ai-stop press" onClick={() => controlsRef.current?.stop()}>
            <span aria-hidden="true" /> {lang === "zh" ? "停止並分析" : "Stop & analyze"}
          </button>
        )}
        {processing && <div className="voice-ai-progress"><i /><i /><i /></div>}
        {status === "error" && (
          <button type="button" className="btn btn-primary press" onClick={retry}><AppIcon name="refresh" size={18} /> {lang === "zh" ? "再試一次" : "Try again"}</button>
        )}
      </div>
    </Sheet>
  );
}

function CameraSheet({ mode, onModeChange, open, lang, onClose, onReview }: { mode: QuickLogMode; onModeChange: (mode: QuickLogMode) => void; open: boolean; lang: Lang; onClose: () => void; onReview: (review: FoodLogReview) => void }) {
  const customFoods = useStore((state) => state.customFoods);
  const allRecipes = useStore((state) => state.recipes);
  const addCustomFood = useStore((state) => state.addCustomFood);
  const imageCatalog = useMemo(
    () => customFoods.filter((food) => food.custom).map(foodCandidateFromItem).slice(0, 120),
    [customFoods]
  );
  const currentRecipeCatalog = useMemo(
    () => allRecipes.filter((recipe) => recipe.custom).map(recipeCandidateFromItem).slice(0, 120),
    [allRecipes]
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "ready" | "analyzing" | "looking" | "error">("starting");
  const [message, setMessage] = useState("");

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const finish = useCallback((review: FoodLogReview) => {
    stopCamera();
    onReview(review);
  }, [onReview, stopCamera]);

  const handleBarcode = useCallback(async (raw: string) => {
    const code = raw.replace(/\D/g, "");
    if (![8, 12, 13, 14].includes(code.length)) {
      setMessage(lang === "zh" ? "無法辨識條碼，請再掃一次。" : "Couldn't read that barcode. Try scanning it again.");
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus("looking");
    setMessage("");
    playSound("scan");
    stopCamera();
    const known = customFoods.find((food) => food.barcode === code);
    const found = known ?? await lookupBarcode(code);
    if (found) {
      if (!known) addCustomFood(found);
      finish(reviewFromFood(found, "barcode", lang, lang === "zh" ? "條碼商品資料" : "Barcode product database"));
    } else {
      setStatus("error");
      setMessage(lang === "zh" ? "找不到這項商品。你可以拍正面照片，或手動輸入營養。" : "Product not found. Take a front photo instead, or enter its nutrition manually.");
      busyRef.current = false;
    }
  }, [addCustomFood, customFoods, finish, lang, stopCamera]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    busyRef.current = false;
    setStatus("starting");
    setMessage("");
    (async () => {
      try {
        if (mode === "scan") {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          if (!videoRef.current || cancelled) return;
          const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
            if (result && !busyRef.current) void handleBarcode(result.getText());
          });
          if (cancelled) {
            controls.stop();
            return;
          }
          controlsRef.current = controls;
        } else {
          if (!navigator.mediaDevices?.getUserMedia || !videoRef.current || cancelled) throw new Error("camera-unavailable");
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          controlsRef.current = { stop: () => stream.getTracks().forEach((track) => track.stop()) };
        }
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage(lang === "zh" ? "無法開啟相機。你仍可選擇照片。" : "Camera unavailable. You can still choose a photo.");
        }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [handleBarcode, lang, mode, open, stopCamera]);

  const analyzeImage = async (imageDataUrl: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    stopCamera();
    setStatus("analyzing");
    setMessage("");
    try {
      const response = await apiFetch("/api/food-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, catalog: imageCatalog, recipeCatalog: currentRecipeCatalog }),
      });
      const data = (await response.json()) as { estimate?: FoodPhotoEstimate; error?: string; code?: string };
      if (!response.ok || !data.estimate) {
        throw new Error(data.code === "AI_NOT_CONFIGURED"
          ? lang === "zh" ? "尚未設定 AI 圖片分析。" : "AI photo estimates are not configured yet."
          : data.error || (lang === "zh" ? "無法分析照片。" : "The photo could not be analyzed."));
      }
      finish(reviewFromPhoto(data.estimate, lang));
    } catch (caught) {
      setStatus("error");
      setMessage(isNativeApiOriginMissingError(caught)
        ? nativeApiUnavailableMessage(lang, "photo")
        : caught instanceof Error
          ? caught.message
          : lang === "zh" ? "無法分析照片。" : "The photo could not be analyzed.");
      busyRef.current = false;
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    void analyzeImage(canvas.toDataURL("image/jpeg", 0.84));
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    try {
      await analyzeImage(await prepareFoodImage(file));
    } catch (caught) {
      setStatus("error");
      setMessage(caught instanceof Error ? caught.message : "The photo could not be prepared.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name={mode === "scan" ? "barcode" : "camera"} size={20} /> {mode === "scan" ? (lang === "zh" ? "掃描條碼" : "Scan barcode") : (lang === "zh" ? "AI 食物照片" : "AI food photo")}</span>}>
      <div className="camera-unified pb-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => void chooseFile(event.target.files?.[0])} />
        <div className="seg w-full">
          <button className={`seg-item ${mode === "scan" ? "on" : ""}`} onClick={() => onModeChange("scan")}><AppIcon name="barcode" size={16} /> {lang === "zh" ? "掃碼" : "Scanner"}</button>
          <button className={`seg-item ${mode === "photo" ? "on" : ""}`} onClick={() => onModeChange("photo")}><AppIcon name="magic" size={16} /> {lang === "zh" ? "AI 照片" : "AI photo"}</button>
        </div>
        <div className="camera-viewport">
          <video ref={videoRef} muted playsInline />
          {mode === "scan" && <div className="camera-reticle" />}
          {(status === "starting" || status === "looking" || status === "analyzing") && (
            <div className="camera-status"><AppIcon name="refresh" size={22} className="a-spin" /> {status === "analyzing" ? (lang === "zh" ? "分析照片中…" : "Analyzing photo…") : status === "looking" ? (lang === "zh" ? "查詢商品中…" : "Finding product…") : (lang === "zh" ? "開啟相機…" : "Opening camera…")}</div>
          )}
        </div>
        {message && <div className="target-error" role="alert">{message}</div>}
        {mode === "scan" ? (
          <div className="t-cap text-center">{lang === "zh" ? "將條碼置於框內；辨識後會自動查詢。" : "Place the barcode inside the frame; lookup starts automatically."}</div>
        ) : (
          <div className="camera-controls">
            <button className="camera-secondary press" onClick={() => fileRef.current?.click()}><AppIcon name="upload" size={20} /><span>{lang === "zh" ? "選照片" : "Choose photo"}</span></button>
            <button className="camera-shutter press" disabled={status !== "ready"} onClick={captureFrame} aria-label={lang === "zh" ? "拍照" : "Take photo"}><span /></button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function ManualFoodSheet({ open, lang, onClose, onReview }: { open: boolean; lang: Lang; onClose: () => void; onReview: (review: FoodLogReview) => void }) {
  const addRecipe = useStore((state) => state.addRecipe);
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [cal, setCal] = useState("");
  const [calEdited, setCalEdited] = useState(false);
  const [basisAmount, setBasisAmount] = useState("1");
  const [basisUnit, setBasisUnit] = useState<NutritionUnit>("serving");
  const [save, setSave] = useState(true);
  const autoCal = caloriesFromMacros({ protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0 });
  const calorieValue = calEdited ? Number(cal) : autoCal;
  const amountValue = Number(basisAmount);
  const valid = Boolean(name.trim()) && Number.isFinite(amountValue) && amountValue > 0 && Number.isFinite(calorieValue) && calorieValue >= 0;

  const submit = () => {
    if (!valid) return;
    const macros = { cal: calorieValue, protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0 };
    const id = `cr-${newId()}`;
    if (save) {
      addRecipe({
        id,
        name: { en: name.trim(), zh: name.trim() },
        emoji: "cutlery",
        cat: "custom",
        minutes: 0,
        difficulty: 1,
        servings: 1,
        perServing: macros,
        nutritionBasis: { amount: amountValue, unit: basisUnit },
        ingredients: [],
        tags: [],
        custom: true,
      });
    }
    const amountLabel = `${formatAmount(amountValue)} ${nutritionUnitLabel(basisUnit, amountValue, lang)}`;
    onReview({
      id: newId(),
      source: "manual",
      description: `${name.trim()} · ${amountLabel}`,
      rationale: lang === "zh" ? "使用你親自輸入的單位營養資料。" : "Uses the nutrition you entered for this exact amount.",
      confidence: 100,
      items: [{ name: { en: name.trim(), zh: name.trim() }, emoji: "cutlery", qtyLabel: amountLabel, amount: amountValue, amountUnit: basisUnit, macros, refId: save ? id : undefined }],
    });
    setName(""); setCal(""); setCalEdited(false); setProtein(""); setCarbs(""); setFat(""); setBasisAmount("1"); setBasisUnit("serving");
  };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name="manual" size={20} /> {lang === "zh" ? "自訂食物" : "Custom food"}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <input className="field" placeholder={lang === "zh" ? "食物名稱" : "Food name"} value={name} onChange={(event) => setName(event.target.value)} />
        <div>
          <div className="t-cap mb-1">{lang === "zh" ? "以下營養資料適用於" : "Nutrition below is for"}</div>
          <div className="grid grid-cols-2 gap-2">
            <input className="field" type="number" inputMode="decimal" min="0.01" step="any" value={basisAmount} onChange={(event) => setBasisAmount(event.target.value)} aria-label={lang === "zh" ? "基準數量" : "Basis amount"} />
            <select className="field" value={basisUnit} onChange={(event) => setBasisUnit(event.target.value as NutritionUnit)} aria-label={lang === "zh" ? "基準單位" : "Basis unit"}>
              {NUTRITION_UNITS.map((unit) => <option key={unit} value={unit}>{nutritionUnitLabel(unit, 2, lang)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" inputMode="decimal" placeholder={lang === "zh" ? "蛋白質 g" : "Protein g"} value={protein} onChange={(event) => setProtein(event.target.value)} />
          <input className="field" inputMode="decimal" placeholder={lang === "zh" ? "碳水 g" : "Carbs g"} value={carbs} onChange={(event) => setCarbs(event.target.value)} />
          <input className="field" inputMode="decimal" placeholder={lang === "zh" ? "脂肪 g" : "Fat g"} value={fat} onChange={(event) => setFat(event.target.value)} />
          <div className="field-with-action">
            <input className="field" inputMode="numeric" placeholder="cal" value={calEdited ? cal : String(autoCal)} onChange={(event) => { setCal(event.target.value); setCalEdited(true); }} />
            {calEdited && <button type="button" className="field-action press" onClick={() => { setCal(""); setCalEdited(false); }}>{lang === "zh" ? "自動" : "Auto"}</button>}
          </div>
        </div>
        <div className="t-cap">{lang === "zh" ? "熱量會依蛋白質、碳水和脂肪自動計算，但你可以直接修改。" : "Calories are calculated from protein, carbs, and fat, but you can override them."}</div>
        <label className="flex items-center gap-2 t-sub px-1"><input type="checkbox" checked={save} onChange={(event) => setSave(event.target.checked)} /> {lang === "zh" ? "存到我的食物與食譜，方便之後搜尋" : "Save to My foods & recipes for future searches"}</label>
        <button className="btn btn-primary press" disabled={!valid} onClick={submit}>{lang === "zh" ? "繼續確認" : "Review food"}</button>
      </div>
    </Sheet>
  );
}

function foodFromOnlineResult(result: OnlineFoodResult): FoodItem {
  const grams = result.grams && result.grams > 0 ? result.grams : 100;
  const toPer100 = 100 / grams;
  return {
    id: result.id,
    name: { en: result.name, zh: result.name },
    aliases: result.brand ? [result.brand] : undefined,
    emoji: "🛒",
    cat: "snack",
    per100: {
      cal: Math.round(result.cal * toPer100),
      protein: Math.round(result.protein * toPer100 * 10) / 10,
      carbs: Math.round(result.carbs * toPer100 * 10) / 10,
      fat: Math.round(result.fat * toPer100 * 10) / 10,
    },
    serving: { label: { en: result.serving, zh: result.serving }, grams },
    source: { name: result.source, id: result.id.replace(/^off-/, "") },
    barcode: result.id.replace(/^off-/, ""),
    custom: true,
  };
}

function reviewFromFood(food: FoodItem, source: ReviewSource, lang: Lang, matchedOn: string): FoodLogReview {
  const serving = resolveFoodServing(food, lang);
  const usageNote = food.usageNote?.[lang] || food.usageNote?.en;
  return {
    id: newId(),
    source,
    description: `${serving.label} ${food.name[lang] || food.name.en}`,
    rationale: usageNote
      ? `${lang === "zh" ? `比對來源：${matchedOn}。` : `Matched from ${matchedOn}.`} ${usageNote}`
      : lang === "zh" ? `比對來源：${matchedOn}。使用資料庫中的標準份量。` : `Matched from ${matchedOn}. Uses the catalog's stated serving and nutrition.`,
    confidence: source === "barcode" ? 99 : 100,
    items: [{ name: food.name, emoji: food.emoji, qtyLabel: serving.label, grams: serving.grams, macros: serving.macros, refId: food.id }],
  };
}

function reviewFromRecentLog(entry: LogEntry, lang: Lang): FoodLogReview {
  const amountLabel = recentLogAmountLabel(entry, lang);
  const source: ReviewSource = entry.src === "food" || entry.src === "recipe" || !entry.src ? "search" : entry.src;
  return {
    id: newId(),
    source,
    description: `${amountLabel} ${entry.name[lang] || entry.name.en}`,
    rationale: lang === "zh"
      ? "已從你的飲食記錄複製相同份量與營養資料。"
      : "Copied from your food history with the same portion and nutrition.",
    confidence: 100,
    items: [{
      name: entry.name,
      emoji: entry.emoji || "🍽️",
      qtyLabel: amountLabel,
      grams: entry.grams,
      amount: entry.amount,
      amountUnit: entry.amountUnit,
      macros: entry.macros,
      refId: entry.refId,
    }],
  };
}

function recentLogAmountLabel(entry: LogEntry, lang: Lang): string {
  if (entry.amount != null && entry.amountUnit) {
    return `${formatAmount(entry.amount)} ${nutritionUnitLabel(entry.amountUnit, entry.amount, lang)}`;
  }
  if (entry.grams != null) return `${formatAmount(entry.grams)} ${lang === "zh" ? "克" : "g"}`;
  return lang === "zh" ? "1 份" : "1 serving";
}

function searchResultNutrition(result: FoodSearchResult, lang: Lang): string {
  if (result.kind === "food") {
    const serving = resolveFoodServing(result.item, lang);
    if (result.item.traceIngredient) {
      return lang === "zh" ? `${serving.label} · 微量使用` : `${serving.label} · trace use`;
    }
    const estimate = result.item.nutritionEstimate ? (lang === "zh" ? "估算 · " : "estimate · ") : "";
    return `${estimate}${serving.label} · ${fmtNum(serving.macros.cal)} cal`;
  }
  const basis = nutritionBasis(result.item);
  return `${formatAmount(basis.amount)} ${nutritionUnitLabel(basis.unit, basis.amount, lang)} · ${fmtNum(result.item.perServing.cal)} cal`;
}

function reviewFromRecipe(recipe: Recipe, source: ReviewSource, lang: Lang, matchedOn: string): FoodLogReview {
  const basis = nutritionBasis(recipe);
  const amountLabel = `${formatAmount(basis.amount)} ${nutritionUnitLabel(basis.unit, basis.amount, lang)}`;
  return {
    id: newId(),
    source,
    description: `${recipe.name[lang] || recipe.name.en} · ${amountLabel}`,
    rationale: lang === "zh" ? `比對來源：${matchedOn}。使用你為 ${amountLabel} 設定的營養。` : `Matched from ${matchedOn}. Uses the nutrition saved for ${amountLabel}.`,
    confidence: 100,
    items: [{ name: recipe.name, emoji: recipe.emoji, qtyLabel: amountLabel, amount: basis.amount, amountUnit: basis.unit, macros: recipe.perServing, refId: recipe.id }],
  };
}

function reviewFromPhoto(estimate: FoodPhotoEstimate, lang: Lang): FoodLogReview {
  return {
    id: newId(),
    source: "photo",
    description: estimate.description,
    rationale: estimate.assumptions.length
      ? estimate.assumptions.join(" · ")
      : lang === "zh" ? "依照照片中可見的食物與份量估算。" : "Estimated from the visible food and portion size.",
    confidence: estimate.confidence_score,
    items: estimate.items.map((item) => ({
      name: { en: item.name, zh: item.name },
      emoji: item.emoji || "🍽️",
      qtyLabel: item.portion_description,
      grams: item.estimated_grams ?? undefined,
      refId: item.ref_id ?? undefined,
      macros: { cal: item.cal, protein: item.protein_g, carbs: item.carbs_g, fat: item.fat_g, fiber: item.fiber_g, sugar: item.sugar_g, sodiumMg: item.sodium_mg },
    })),
  };
}

function catalogCandidate(result: FoodSearchResult) {
  return result.kind === "food" ? foodCandidateFromItem(result.item) : recipeCandidateFromItem(result.item);
}

function foodCandidateFromItem(item: FoodItem) {
  const serving = resolveFoodServing(item, "en");
  return { id: item.id, kind: "food" as const, source: "MelonMate food library" as const, name: item.name.en, serving: serving.label, grams: serving.grams, cal: serving.macros.cal, protein: serving.macros.protein, carbs: serving.macros.carbs, fat: serving.macros.fat };
}

function recipeCandidateFromItem(item: Recipe) {
  const basis = nutritionBasis(item);
  return { id: item.id, kind: "recipe" as const, source: "MelonMate recipe" as const, name: item.name.en, serving: `${formatAmount(basis.amount)} ${nutritionUnitLabel(basis.unit, basis.amount, "en")}`, grams: basis.unit === "g" ? basis.amount : null, ingredients: item.ingredients.map((ingredient) => ingredient.name.en), cal: item.perServing.cal, protein: item.perServing.protein, carbs: item.perServing.carbs, fat: item.perServing.fat };
}

const FOOD_NOTE_SPLIT = /(?:,|，|、|;|；|\band\b|\bwith\b|加上|還有|跟|和|以及|\+)/i;

function foodNoteSegments(note: string): string[] {
  return note.split(FOOD_NOTE_SPLIT).map((segment) => segment.trim()).filter(Boolean);
}

function cleanFoodQuery(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/\b(?:i\s+(?:ate|had)|for\s+(?:breakfast|lunch|dinner)|breakfast|lunch|dinner|snack)\b/g, " ")
    .replace(/\b(?:\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)\b/g, " ")
    .replace(/\b(?:large|medium|small|big|extra|about|roughly|around)\b/g, " ")
    .replace(/\b(?:g|grams?|kg|ml|oz|ounces?|cups?|bowls?|slices?|pieces?|servings?|bars?|cans?|glasses?|scoops?)\b/g, " ")
    .replace(/[零一二兩两三四五六七八九十百千半\d.]+\s*(?:克|公克|毫升|顆|個|粒|份|碗|杯|片|條|根|塊|匙|隻)?/g, " ")
    .replace(/(?:早餐|午餐|晚餐|點心|宵夜|早上吃|中午吃|晚上吃)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function catalogSearchQueries(note: string): string[] {
  const queries: string[] = [note];
  for (const segment of foodNoteSegments(note)) {
    queries.push(segment);
    const cleaned = cleanFoodQuery(segment);
    if (cleaned) {
      queries.push(cleaned);
      const words = cleaned.split(/\s+/).filter((word) => word.length >= 2);
      if (words.length > 1) queries.push(...words);
    }
  }
  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
}

function catalogCandidatesForNote(note: string, foods: FoodItem[], recipes: Recipe[]) {
  const seen = new Set<string>();
  const candidates: ReturnType<typeof catalogCandidate>[] = [];
  for (const query of catalogSearchQueries(note)) {
    for (const result of searchFoodCatalog(query, foods, recipes, 12)) {
      const key = `${result.kind}:${result.item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(catalogCandidate(result));
      if (candidates.length >= 60) return candidates;
    }
  }
  return candidates;
}

function hasTrustworthyCatalogMatches(
  note: string,
  refIds: (string | undefined)[],
  foods: FoodItem[],
  recipes: Recipe[]
): boolean {
  const segments = foodNoteSegments(note);
  if (!segments.length || refIds.length !== segments.length || refIds.some((id) => !id)) return false;
  return segments.every((segment, index) => {
    const query = cleanFoodQuery(segment);
    if (!query) return false;
    const exact = searchFoodCatalog(query, foods, recipes, 5)
      .find((result) => result.score >= 120 && result.item.id === refIds[index]);
    return Boolean(exact);
  });
}

function formatAmount(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function formatServingCount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 1 });
}

function servingBasisLabel(item: ReviewItem, lang: Lang): string {
  if (item.grams == null) return lang === "zh" ? `1 份 = ${item.qtyLabel}` : `1 serving = ${item.qtyLabel}`;
  const unit = /(?:ml|millilit(?:er|re)|毫升)/i.test(item.qtyLabel) ? "ml" : lang === "zh" ? "克" : "g";
  const amount = `${item.grams.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unit}`;
  if (labelIncludesAmount(item.qtyLabel)) return lang === "zh" ? `每份：${item.qtyLabel}` : `Per serving: ${item.qtyLabel}`;
  return lang === "zh" ? `1 份 = ${item.qtyLabel} · ${amount}` : `1 serving = ${item.qtyLabel} · ${amount}`;
}

function scaledServingLabel(item: ReviewItem, servings: number, lang: Lang): string {
  const prefix = servings === 1 ? item.qtyLabel : `${formatServingCount(servings)} × ${item.qtyLabel}`;
  if (item.grams == null || (servings === 1 && labelIncludesAmount(item.qtyLabel))) return prefix;
  const unit = /(?:ml|millilit(?:er|re)|毫升)/i.test(item.qtyLabel) ? "ml" : lang === "zh" ? "克" : "g";
  return `${prefix} · ${item.grams.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${unit}`;
}

function labelIncludesAmount(label: string): boolean {
  return /\d(?:[\d.,]*\d)?\s*(?:g|grams?|kg|ml|millilit(?:er|re)s?|oz|ounces?|克|公克|公斤|毫升|盎司)\b/i.test(label);
}

async function prepareFoodImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Use a JPEG, PNG, or WebP photo.");
  if (file.size > 15 * 1024 * 1024) throw new Error("That photo is too large. Choose one under 15 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the photo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.84);
}
