import type { FoodItem, Lang, Macros, MealSlot, Recipe } from "./types";
import { resolveCountedFood } from "./foodServing";
import { mulMacros, scaleMacros } from "./nutrition";

/** A parsed, loggable candidate from a voice transcript. */
export interface VoiceHit {
  name: { en: string; zh: string };
  emoji?: string;
  grams?: number;
  qtyLabel: string;
  macros: Macros;
  meal?: MealSlot;
  refId?: string;
  src: "voice";
}

/* ---------------- number words ---------------- */

const ZH_DIGITS: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 兩: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5,
};

const EN_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5, quarter: 0.25,
};

/** parse Chinese numerals like 兩百五十 / 三十 / 十二 / 半 */
export function zhNumber(str: string): number | undefined {
  if (!str) return undefined;
  if (/^[\d.]+$/.test(str)) return parseFloat(str);
  let total = 0;
  let cur = 0;
  let any = false;
  for (const ch of str) {
    if (ch === "百") {
      cur = (cur || 1) * 100;
      total += cur;
      cur = 0;
      any = true;
    } else if (ch === "千") {
      cur = (cur || 1) * 1000;
      total += cur;
      cur = 0;
      any = true;
    } else if (ch === "十") {
      cur = (cur || 1) * 10;
      total += cur;
      cur = 0;
      any = true;
    } else if (ch in ZH_DIGITS) {
      cur = ZH_DIGITS[ch];
      any = true;
    } else {
      return undefined;
    }
  }
  total += cur;
  return any ? total : undefined;
}

/* ---------------- meal detection ---------------- */

const MEAL_WORDS: [RegExp, MealSlot][] = [
  [/早餐|早上吃|breakfast/i, "breakfast"],
  [/午餐|中午吃|lunch/i, "lunch"],
  [/晚餐|晚上吃|dinner|supper/i, "dinner"],
  [/點心|宵夜|零食|snack/i, "snack"],
];

export function defaultMealByTime(): MealSlot {
  const h = new Date().getHours();
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

/* ---------------- unit patterns ---------------- */

interface QtyMatch {
  count?: number; // count of servings/pieces
  grams?: number; // explicit grams
  ml?: number;
}

const NUM_RE = "((?:\\d+(?:\\.\\d+)?)|(?:[零一二兩两三四五六七八九十百千半]+)|(?:one|two|three|four|five|six|seven|eight|nine|ten|half|a|an))";

function toNum(raw: string): number | undefined {
  if (!raw) return undefined;
  if (/^[\d.]+$/.test(raw)) return parseFloat(raw);
  const low = raw.toLowerCase();
  if (low in EN_WORDS) return EN_WORDS[low];
  return zhNumber(raw);
}

function extractQty(segment: string): QtyMatch {
  // grams
  let m = segment.match(new RegExp(`${NUM_RE}\\s*(?:g|克|公克|公克重|grams?|gram)`, "i"));
  if (m) {
    const n = toNum(m[1]);
    if (n != null) return { grams: n };
  }
  // ml
  m = segment.match(new RegExp(`${NUM_RE}\\s*(?:ml|毫升|cc)`, "i"));
  if (m) {
    const n = toNum(m[1]);
    if (n != null) return { ml: n };
  }
  // counted units (顆/個/份/碗/杯/片/條/根/匙/scoop/bowl/cup/slice/piece/serving/egg-count style)
  m = segment.match(
    new RegExp(
      `${NUM_RE}\\s*(?:顆|個|粒|份|碗|杯|片|條|根|塊|匙|隻|scoops?|bowls?|cups?|slices?|pieces?|servings?|bars?|cans?|glass(?:es)?)`,
      "i"
    )
  );
  if (m) {
    const n = toNum(m[1]);
    if (n != null) return { count: n };
  }
  // bare leading number ("2 eggs" / "兩雞蛋")
  m = segment.match(new RegExp(`(?:^|\\s)${NUM_RE}(?=\\s|$)`, "i"));
  if (m) {
    const n = toNum(m[1]);
    if (n != null && n > 0 && n <= 20) return { count: n };
  }
  return {};
}

/* ---------------- main parser ---------------- */

export function parseVoiceFood(
  transcript: string,
  foods: FoodItem[],
  recipes: Recipe[],
  lang: Lang
): VoiceHit[] {
  const text = transcript.trim();
  if (!text) return [];

  let meal: MealSlot | undefined;
  for (const [re, slot] of MEAL_WORDS) {
    if (re.test(text)) {
      meal = slot;
      break;
    }
  }

  // split into food segments
  const segments = text
    .split(/(?:,|，|、|;|；| and | with |加上|還有|跟|和|以及|\+)/i)
    .map((x) => x.trim())
    .filter(Boolean);

  const hits: VoiceHit[] = [];

  for (const seg of segments) {
    const segLow = seg.toLowerCase();

    // try recipes first (longest zh/en name match)
    let bestRecipe: Recipe | undefined;
    let bestRecipeLen = 0;
    for (const r of recipes) {
      const zh = r.name.zh;
      const en = r.name.en.toLowerCase();
      if (zh && seg.includes(zh) && zh.length > bestRecipeLen) {
        bestRecipe = r;
        bestRecipeLen = zh.length;
      }
      const enCore = en.split("+")[0].trim();
      if (enCore.length > 3 && segLow.includes(enCore) && enCore.length > bestRecipeLen) {
        bestRecipe = r;
        bestRecipeLen = enCore.length;
      }
    }

    // then foods — check zh name, en name, and en words
    let bestFood: FoodItem | undefined;
    let bestLen = 0;
    let bestFoodScore = 0;
    for (const f of foods) {
      const curatedBonus = f.source ? 0 : 10;
      const chooseFood = (score: number, matchedLength: number) => {
        if (score > bestFoodScore) {
          bestFood = f;
          bestLen = matchedLength;
          bestFoodScore = score;
        }
      };
      const zh = f.name.zh;
      if (zh) {
        // allow partial zh matches like 蛋 in 雞蛋 or 飯 in 白飯 — CJK chars only,
        // so spaces/digits inside names like 乳清蛋白（1 匙） can't false-match
        const zhCore = zh.replace(/[^一-鿿]/g, "");
        if (seg.includes(zh)) {
          chooseFood(1000 + zh.length + curatedBonus, zh.length);
        } else if (zhCore.length >= 1) {
          for (let l = zhCore.length; l >= 1; l--) {
            let found = false;
            for (let i = 0; i + l <= zhCore.length; i++) {
              const sub = zhCore.slice(i, i + l);
              if (seg.includes(sub)) {
                chooseFood(500 + l + curatedBonus, l);
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
      }
      const en = f.name.en.toLowerCase().replace(/\(.*?\)/g, "").trim();
      if (en && segLow.includes(en)) {
        chooseFood(800 + en.length + curatedBonus, en.length);
      } else {
        // singular / first word ("eggs" -> "egg", "chicken breast")
        const w = en.split(" ")[0];
        if (w.length >= 3 && (segLow.includes(w) || segLow.includes(w + "s"))) {
          chooseFood(300 + w.length + curatedBonus, w.length);
        }
      }
    }

    const qty = extractQty(seg);

    if (bestRecipe && bestRecipeLen >= bestLen) {
      const servings = qty.count ?? 1;
      hits.push({
        name: bestRecipe.name,
        emoji: bestRecipe.emoji,
        qtyLabel: `${servings} ${lang === "zh" ? "份" : servings > 1 ? "servings" : "serving"}`,
        macros: mulMacros(bestRecipe.perServing, servings),
        meal,
        refId: bestRecipe.id,
        src: "voice",
      });
      continue;
    }

    if (bestFood) {
      let grams: number;
      let qtyLabel: string;
      if (qty.grams != null) {
        grams = qty.grams;
        qtyLabel = `${grams} g`;
      } else if (qty.ml != null) {
        grams = qty.ml;
        qtyLabel = `${qty.ml} ml`;
      } else if (qty.count != null) {
        const counted = resolveCountedFood(bestFood, qty.count, lang);
        grams = counted.grams;
        qtyLabel = counted.label;
      } else {
        grams = bestFood.serving?.grams ?? 100;
        qtyLabel = bestFood.serving ? bestFood.serving.label[lang] : "100 g";
      }
      hits.push({
        name: bestFood.name,
        emoji: bestFood.emoji,
        grams,
        qtyLabel,
        macros: scaleMacros(bestFood.per100, grams),
        meal,
        refId: bestFood.id,
        src: "voice",
      });
    }
  }

  return hits;
}

/* ---------------- speech recognition wrapper ---------------- */

export interface RecognitionHandle {
  stop: () => void;
}

export function startRecognition(
  lang: Lang,
  onResult: (transcript: string, isFinal: boolean) => void,
  onEnd: (err?: string) => void
): RecognitionHandle | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = lang === "zh" ? "zh-TW" : "en-US";
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = "";
  rec.onresult = (ev: SpeechRecognitionEventLike) => {
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interim += res[0].transcript;
    }
    onResult(finalText + interim, false);
    if (finalText) onResult(finalText, true);
  };
  rec.onerror = (ev: { error?: string }) => {
    onEnd(ev.error ?? "error");
  };
  rec.onend = () => onEnd();

  try {
    rec.start();
  } catch {
    return null;
  }
  return { stop: () => rec.stop() };
}

/* minimal typings for the vendor-prefixed API */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
  };
}
