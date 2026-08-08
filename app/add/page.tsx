"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useActiveProfile, useStore, newId } from "@/lib/store";
import { BUILTIN_FOODS } from "@/lib/foods";
import { MEAL_ORDER, translate, type DictKey } from "@/lib/i18n";
import { fmtDate, todayStr } from "@/lib/dates";
import { fmtNum, mulMacros, scaleMacros, sumMacros } from "@/lib/nutrition";
import { type FoodPhotoEstimate } from "@/lib/foodPhoto";
import { defaultMealByTime, parseVoiceFood, startRecognition, type RecognitionHandle } from "@/lib/voice";
import { lookupBarcode } from "@/lib/off";
import { selectedRecipesForProfile } from "@/lib/onboarding";
import { searchFoodCatalog, type FoodSearchResult } from "@/lib/foodSearch";
import { melonCheer } from "@/lib/melonCheers";
import { GlassCard, Sheet, toast, fireConfetti } from "@/components/ui";
import { AppIcon, FoodGlyph, MealGlyph, iconFromLegacy } from "@/components/icons";
import { AnimatedFoodHoney, isHoneyTheme } from "@/components/AnimatedFoodHoney";
import type { BiText, FoodItem, Lang, Macros, MealSlot, Recipe } from "@/lib/types";
import { apiFetch, isNativeApiOriginMissingError, nativeApiUnavailableMessage } from "@/lib/api";
import { successHaptic } from "@/lib/nativeApp";
import { playSound } from "@/lib/soundscape";

type ReviewSource = "search" | "text" | "voice" | "photo" | "barcode" | "manual";

interface ReviewItem {
  name: BiText;
  emoji: string;
  qtyLabel: string;
  grams?: number;
  macros: Macros;
  refId?: string;
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
  error?: string;
  code?: string;
}

export default function AddPage() {
  return <Suspense fallback={null}><AddInner /></Suspense>;
}

function AddInner() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = useStore((state) => state.lang);
  const theme = useStore((state) => state.theme);
  const addLog = useStore((state) => state.addLog);
  const profile = useActiveProfile();
  const customFoods = useStore((state) => state.customFoods);
  const allRecipes = useStore((state) => state.recipes);
  const foods = useMemo(() => [...customFoods, ...BUILTIN_FOODS], [customFoods]);
  const recipes = useMemo(() => selectedRecipesForProfile(profile, allRecipes), [allRecipes, profile]);
  const t = (key: DictKey) => translate(key, lang);

  const rawDate = params.get("date");
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : todayStr();
  const isToday = date === todayStr();
  const initialMeal = (params.get("meal") as MealSlot | null) ?? defaultMealByTime();
  const requestedHoneyTheme = params.get("honeyTheme");
  const honeyThemePreview = isHoneyTheme(requestedHoneyTheme) ? requestedHoneyTheme : theme;

  const [meal, setMeal] = useState<MealSlot>(initialMeal);
  const [input, setInput] = useState("");
  const [review, setReview] = useState<FoodLogReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(params.get("mode") === "photo" || params.get("mode") === "scan");
  const [manualOpen, setManualOpen] = useState(params.get("mode") === "manual");
  const recognitionRef = useRef<RecognitionHandle | null>(null);

  const results = useMemo(
    () => input.trim().length >= 2 ? searchFoodCatalog(input, foods, recipes, 10) : [],
    [foods, input, recipes]
  );

  const reviewCatalogResult = (result: FoodSearchResult) => {
    setError("");
    setReview(result.kind === "food"
      ? reviewFromFood(result.item, "search", lang, result.matchedOn)
      : reviewFromRecipe(result.item, "search", lang, result.matchedOn));
  };

  const analyzeText = async (raw: string, source: "text" | "voice") => {
    const note = raw.trim();
    if (!note || busy) return;
    setBusy(true);
    setError("");
    const localHits = parseVoiceFood(note, foods, recipes, lang);
    if (localHits.length > 0) {
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
          macros: hit.macros,
          refId: hit.refId,
        })),
      });
      setBusy(false);
      return;
    }

    try {
      const candidates = searchFoodCatalog(note, foods, recipes, 30).map(catalogCandidate);
      const response = await apiFetch("/api/food-text-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note, lang, catalog: candidates }),
      });
      const data = (await response.json()) as TextEstimateResponse;
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
    } catch (caught) {
      setError(isNativeApiOriginMissingError(caught)
        ? nativeApiUnavailableMessage(lang, "text")
        : caught instanceof Error
          ? caught.message
          : lang === "zh" ? "暫時無法分析這筆飲食。" : "That food note could not be analyzed.");
    } finally {
      setBusy(false);
    }
  };

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const toggleListening = () => {
    if (listening) {
      stopListening();
      return;
    }
    setError("");
    const recognition = startRecognition(
      lang,
      (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal) void analyzeText(transcript, "voice");
      },
      () => setListening(false)
    );
    if (!recognition) {
      setError(lang === "zh" ? "此瀏覽器不支援語音輸入，你仍可直接輸入。" : "Voice input is unavailable here. You can still type your food.");
      return;
    }
    recognitionRef.current = recognition;
    setListening(true);
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

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
    <main className="page log-food-page">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h1 className="t-title icon-label"><AppIcon name="plus" size={22} /> {t("logMeal")}</h1>
          {!isToday && <div className="t-cap mt-1 icon-label"><AppIcon name="calendar" size={14} /> {fmtDate(date, lang)}</div>}
        </div>
        <button className="chip press" onClick={() => router.back()}>{t("done")}</button>
      </header>

      <div className="log-food-stage">
        <AnimatedFoodHoney theme={honeyThemePreview} />
        <GlassCard strong className="log-food-console">
          <p className="log-food-intro">
            {lang === "zh" ? "搜尋、輸入或說出你吃了什麼，也可以用相機拍食物或掃條碼。" : "Search, type or say what you ate, or use the camera for a food photo or barcode."}
          </p>
          <div className={`food-composer ${listening ? "is-listening" : ""}`}>
            <AppIcon name="search" size={20} />
            <input
              value={input}
              onChange={(event) => { setInput(event.target.value); setError(""); }}
              onKeyDown={(event) => { if (event.key === "Enter") void analyzeText(input, "text"); }}
              placeholder={lang === "zh" ? "你吃了什麼？" : "What did you eat?"}
              aria-label={lang === "zh" ? "輸入食物" : "Describe or search food"}
            />
            <button
              type="button"
              className={`food-composer-action press ${listening ? "on" : ""}`}
              onClick={toggleListening}
              aria-label={listening ? (lang === "zh" ? "停止聆聽" : "Stop listening") : (lang === "zh" ? "語音輸入" : "Speak food")}
            >
              <AppIcon name={listening ? "close" : "microphone"} size={21} />
            </button>
            <button
              type="button"
              className="food-composer-submit press"
              disabled={!input.trim() || busy}
              onClick={() => void analyzeText(input, "text")}
              aria-label={lang === "zh" ? "分析" : "Analyze food"}
            >
              <AppIcon name={busy ? "refresh" : "next"} size={20} className={busy ? "a-spin" : ""} />
            </button>
          </div>
          <div className="log-food-actions">
            <button className="log-food-action press" onClick={() => setCameraOpen(true)}>
              <span><AppIcon name="camera" size={22} /></span>
              <b>{lang === "zh" ? "相機" : "Camera"}</b>
              <small>{lang === "zh" ? "拍照或條碼" : "Photo or barcode"}</small>
            </button>
            <button className="log-food-action press" onClick={() => setManualOpen(true)}>
              <span><AppIcon name="manual" size={22} /></span>
              <b>{lang === "zh" ? "自訂" : "Custom"}</b>
              <small>{lang === "zh" ? "自行輸入營養" : "Enter nutrition"}</small>
            </button>
          </div>
        </GlassCard>
      </div>

      {listening && <div className="food-listening" role="status"><span />{lang === "zh" ? "聆聽中…" : "Listening…"}</div>}
      {error && <div className="target-error mt-3" role="alert">{error}</div>}

      {!review && results.length > 0 && (
        <GlassCard className="food-search-results mt-3 px-4 py-1">
          {results.map((result) => (
            <button key={`${result.kind}-${result.item.id}`} type="button" className="row row-button press" onClick={() => reviewCatalogResult(result)}>
              <FoodGlyph category={result.item.cat} size={19} />
              <span className="flex-1 min-w-0">
                <b className="block truncate">{result.item.name[lang] || result.item.name.en}</b>
                <small className="t-cap">{result.matchedOn} · {searchResultNutrition(result, lang)}</small>
              </span>
              <AppIcon name="next" size={17} />
            </button>
          ))}
        </GlassCard>
      )}

      {review && (
        <FoodReviewCard
          key={review.id}
          review={review}
          initialMeal={meal}
          lang={lang}
          onMealChange={setMeal}
          onBack={() => setReview(null)}
          onConfirm={confirmReview}
        />
      )}

      <CameraSheet open={cameraOpen} lang={lang} onClose={() => setCameraOpen(false)} onReview={(next) => { setCameraOpen(false); setReview(next); }} />
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
  const original = sumMacros(review.items.map((item) => item.macros));
  const [editedCal, setEditedCal] = useState(String(Math.round(original.cal)));
  const cal = Number(editedCal);
  const valid = editedCal !== "" && Number.isFinite(cal) && cal >= 0 && cal <= 20_000;
  const factor = valid && original.cal > 0 ? cal / original.cal : 1;
  const adjustedItems = review.items.map((item) => ({ ...item, macros: scaleMacroFactor(item.macros, factor) }));
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
        {adjustedItems.map((item, index) => (
          <div className="food-review-item" key={`${item.refId ?? item.name.en}-${index}`}>
            <span><AppIcon name={iconFromLegacy(item.emoji, "cutlery")} size={20} /></span>
            <div className="flex-1 min-w-0"><b>{item.name[lang] || item.name.en}</b><small>{item.qtyLabel}</small></div>
            <strong>{fmtNum(item.macros.cal)} cal</strong>
          </div>
        ))}
      </div>

      <div className="food-rationale"><AppIcon name="idea" size={18} /><span><b>{lang === "zh" ? "計算依據" : "Why this estimate"}</b>{review.rationale}</span></div>

      <div className="photo-calorie-editor mt-4">
        <label htmlFor="review-cal">{lang === "zh" ? "熱量" : "Calories"}</label>
        <div className="photo-calorie-controls">
          <button type="button" className="ibtn press" onClick={() => setEditedCal(String(Math.max(0, Math.round((valid ? cal : original.cal) - 10))))} aria-label="Decrease calories by 10"><AppIcon name="minus" size={18} /></button>
          <div className="photo-calorie-input"><input id="review-cal" inputMode="numeric" value={editedCal} onChange={(event) => setEditedCal(event.target.value.replace(/\D/g, "").slice(0, 5))} aria-invalid={!valid} /><span>cal</span></div>
          <button type="button" className="ibtn press" onClick={() => setEditedCal(String(Math.min(20_000, Math.round((valid ? cal : original.cal) + 10))))} aria-label="Increase calories by 10"><AppIcon name="plus" size={18} /></button>
        </div>
      </div>

      <div className="nutrition-details tabular mt-3"><span>P {fmtNum(adjusted.protein)}g</span><span>C {fmtNum(adjusted.carbs)}g</span><span>F {fmtNum(adjusted.fat)}g</span></div>
      <div className="mt-3"><MealPick slot={meal} setSlot={chooseMeal} lang={lang} /></div>
      <div className="flex gap-2 mt-3">
        <button className="btn btn-ghost press" onClick={onBack}>{lang === "zh" ? "返回" : "Back"}</button>
        <button className="btn btn-primary press flex-1" disabled={!valid} onClick={() => onConfirm(adjustedItems, meal)}><AppIcon name="checkCircle" size={18} /> {lang === "zh" ? "確認並記錄" : "Confirm & log"}</button>
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

function CameraSheet({ open, lang, onClose, onReview }: { open: boolean; lang: Lang; onClose: () => void; onReview: (review: FoodLogReview) => void }) {
  const customFoods = useStore((state) => state.customFoods);
  const addCustomFood = useStore((state) => state.addCustomFood);
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
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage(lang === "zh" ? "無法開啟相機。你仍可選擇照片。" : "Camera unavailable. You can still choose a photo.");
        }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [handleBarcode, lang, open, stopCamera]);

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
        body: JSON.stringify({ imageDataUrl }),
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
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name="camera" size={20} /> {lang === "zh" ? "拍食物或掃條碼" : "Photo or barcode"}</span>}>
      <div className="camera-unified pb-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => void chooseFile(event.target.files?.[0])} />
        <div className="camera-viewport">
          <video ref={videoRef} muted playsInline />
          <div className="camera-reticle" />
          {(status === "starting" || status === "looking" || status === "analyzing") && (
            <div className="camera-status"><AppIcon name="refresh" size={22} className="a-spin" /> {status === "analyzing" ? (lang === "zh" ? "分析食物中…" : "Analyzing food…") : status === "looking" ? (lang === "zh" ? "查詢商品中…" : "Finding product…") : (lang === "zh" ? "開啟相機…" : "Opening camera…")}</div>
          )}
        </div>
        {message && <div className="target-error" role="alert">{message}</div>}
        <div className="camera-controls">
          <button className="camera-secondary press" onClick={() => fileRef.current?.click()}><AppIcon name="upload" size={20} /><span>{lang === "zh" ? "選照片" : "Choose photo"}</span></button>
          <button className="camera-shutter press" disabled={status !== "ready"} onClick={captureFrame} aria-label={lang === "zh" ? "拍照" : "Take food photo"}><span /></button>
        </div>
      </div>
    </Sheet>
  );
}

function ManualFoodSheet({ open, lang, onClose, onReview }: { open: boolean; lang: Lang; onClose: () => void; onReview: (review: FoodLogReview) => void }) {
  const addCustomFood = useStore((state) => state.addCustomFood);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [save, setSave] = useState(true);
  const valid = Boolean(name.trim()) && cal !== "" && Number(cal) >= 0;

  const submit = () => {
    if (!valid) return;
    const macros = { cal: Number(cal), protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0 };
    const id = `cf-${newId()}`;
    if (save) {
      addCustomFood({ id, name: { en: name.trim(), zh: name.trim() }, emoji: "🍽️", cat: "other", per100: macros, serving: { label: { en: "1 serving", zh: "1 份" }, grams: 100 }, custom: true });
    }
    onReview({
      id: newId(),
      source: "manual",
      description: `${name.trim()} · 1 ${lang === "zh" ? "份" : "serving"}`,
      rationale: lang === "zh" ? "使用你親自輸入的每份營養資料。" : "Uses the per-serving nutrition you entered.",
      confidence: 100,
      items: [{ name: { en: name.trim(), zh: name.trim() }, emoji: "🍽️", qtyLabel: lang === "zh" ? "1 份" : "1 serving", macros, refId: save ? id : undefined }],
    });
    setName(""); setCal(""); setProtein(""); setCarbs(""); setFat("");
  };

  return (
    <Sheet open={open} onClose={onClose} title={<span className="icon-label"><AppIcon name="manual" size={20} /> {lang === "zh" ? "自訂食物" : "Custom food"}</span>}>
      <div className="flex flex-col gap-3 pb-2">
        <input className="field" placeholder={lang === "zh" ? "食物名稱" : "Food name"} value={name} onChange={(event) => setName(event.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field" inputMode="numeric" placeholder="cal *" value={cal} onChange={(event) => setCal(event.target.value)} />
          <input className="field" inputMode="decimal" placeholder={lang === "zh" ? "蛋白質 g" : "Protein g"} value={protein} onChange={(event) => setProtein(event.target.value)} />
          <input className="field" inputMode="decimal" placeholder={lang === "zh" ? "碳水 g" : "Carbs g"} value={carbs} onChange={(event) => setCarbs(event.target.value)} />
          <input className="field" inputMode="decimal" placeholder={lang === "zh" ? "脂肪 g" : "Fat g"} value={fat} onChange={(event) => setFat(event.target.value)} />
        </div>
        <label className="flex items-center gap-2 t-sub px-1"><input type="checkbox" checked={save} onChange={(event) => setSave(event.target.checked)} /> {lang === "zh" ? "存到我的食材，方便之後搜尋" : "Save to My ingredients for future searches"}</label>
        <button className="btn btn-primary press" disabled={!valid} onClick={submit}>{lang === "zh" ? "繼續確認" : "Review food"}</button>
      </div>
    </Sheet>
  );
}

function reviewFromFood(food: FoodItem, source: ReviewSource, lang: Lang, matchedOn: string): FoodLogReview {
  const grams = food.serving?.grams ?? 100;
  const qtyLabel = food.serving?.label[lang] || food.serving?.label.en || "100 g";
  return {
    id: newId(),
    source,
    description: `${qtyLabel} ${food.name[lang] || food.name.en}`,
    rationale: lang === "zh" ? `比對來源：${matchedOn}。使用資料庫中的標準份量。` : `Matched from ${matchedOn}. Uses the catalog's stated serving and nutrition.`,
    confidence: source === "barcode" ? 99 : 100,
    items: [{ name: food.name, emoji: food.emoji, qtyLabel, grams, macros: scaleMacros(food.per100, grams), refId: food.id }],
  };
}

function searchResultNutrition(result: FoodSearchResult, lang: Lang): string {
  if (result.kind === "food") {
    const grams = result.item.serving?.grams ?? 100;
    const servingLabel = result.item.serving?.label[lang]
      || result.item.serving?.label.en
      || (lang === "zh" ? "每 100 克" : "per 100 g");
    return `${servingLabel} · ${fmtNum(scaleMacros(result.item.per100, grams).cal)} cal`;
  }
  return `${lang === "zh" ? "每份" : "per serving"} · ${fmtNum(result.item.perServing.cal)} cal`;
}

function reviewFromRecipe(recipe: Recipe, source: ReviewSource, lang: Lang, matchedOn: string): FoodLogReview {
  return {
    id: newId(),
    source,
    description: `${recipe.name[lang] || recipe.name.en} · 1 ${lang === "zh" ? "份" : "serving"}`,
    rationale: lang === "zh" ? `比對來源：${matchedOn}。使用你食譜中設定的每份營養。` : `Matched from ${matchedOn}. Uses the per-serving nutrition saved with this recipe.`,
    confidence: 100,
    items: [{ name: recipe.name, emoji: recipe.emoji, qtyLabel: lang === "zh" ? "1 份" : "1 serving", macros: mulMacros(recipe.perServing, 1), refId: recipe.id }],
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
    items: [{
      name: { en: estimate.name, zh: estimate.name },
      emoji: estimate.emoji || "🍽️",
      qtyLabel: estimate.portion_description,
      grams: estimate.estimated_grams,
      macros: { cal: estimate.cal, protein: estimate.protein_g, carbs: estimate.carbs_g, fat: estimate.fat_g, fiber: estimate.fiber_g, sugar: estimate.sugar_g, sodiumMg: estimate.sodium_mg },
    }],
  };
}

function catalogCandidate(result: FoodSearchResult) {
  if (result.kind === "food") {
    const grams = result.item.serving?.grams ?? 100;
    const macros = scaleMacros(result.item.per100, grams);
    return { id: result.item.id, kind: "food" as const, name: result.item.name.en, emoji: result.item.emoji, serving: result.item.serving?.label.en ?? "100 g", cal: macros.cal, protein: macros.protein, carbs: macros.carbs, fat: macros.fat };
  }
  return { id: result.item.id, kind: "recipe" as const, name: result.item.name.en, emoji: result.item.emoji, serving: "1 serving", ingredients: result.item.ingredients.map((ingredient) => ingredient.name.en), cal: result.item.perServing.cal, protein: result.item.perServing.protein, carbs: result.item.perServing.carbs, fat: result.item.perServing.fat };
}

function scaleMacroFactor(macros: Macros, factor: number): Macros {
  const one = (value: number | undefined) => value == null ? undefined : Math.round(Math.max(0, value * factor) * 10) / 10;
  return { cal: Math.round(Math.max(0, macros.cal * factor)), protein: one(macros.protein) ?? 0, carbs: one(macros.carbs) ?? 0, fat: one(macros.fat) ?? 0, fiber: one(macros.fiber), sugar: one(macros.sugar), sodiumMg: macros.sodiumMg == null ? undefined : Math.round(Math.max(0, macros.sodiumMg * factor)) };
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
