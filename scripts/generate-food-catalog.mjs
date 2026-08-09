import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const input = process.argv[2];
if (!input) {
  throw new Error("Usage: node scripts/generate-food-catalog.mjs <FoodData Central SR Legacy JSON>");
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(projectRoot, "lib", "foods.generated.json");
const payload = JSON.parse(fs.readFileSync(path.resolve(input), "utf8"));
const sourceFoods = payload.SRLegacyFoods;
if (!Array.isArray(sourceFoods)) throw new Error("Expected an SRLegacyFoods array");

const categoryCaps = new Map([
  ["Vegetables and Vegetable Products", 650],
  ["Fruits and Fruit Juices", 355],
  ["Legumes and Legume Products", 260],
  ["Nut and Seed Products", 137],
  ["Cereal Grains and Pasta", 181],
  ["Spices and Herbs", 63],
  ["Dairy and Egg Products", 250],
  ["Finfish and Shellfish Products", 240],
  ["Poultry Products", 200],
  ["Pork Products", 160],
  ["Beef Products", 180],
  ["Lamb, Veal, and Game Products", 100],
  ["Fats and Oils", 120],
  ["Soups, Sauces, and Gravies", 100],
  ["Baked Products", 100],
  ["Sausages and Luncheon Meats", 100],
  ["Beverages", 100],
  ["Breakfast Cereals", 80],
  ["Sweets", 60],
  ["Snacks", 60],
  ["Meals, Entrees, and Side Dishes", 50],
]);

const translatedBases = new Map(Object.entries({
  apples: "蘋果", apricots: "杏桃", avocados: "酪梨", bananas: "香蕉",
  blackberries: "黑莓", blueberries: "藍莓", cherries: "櫻桃", cranberries: "蔓越莓",
  dates: "椰棗", figs: "無花果", grapes: "葡萄", grapefruit: "葡萄柚", guavas: "芭樂",
  kiwifruit: "奇異果", lemons: "檸檬", limes: "萊姆", litchis: "荔枝", longans: "龍眼",
  mangos: "芒果", mangosteen: "山竹", mulberries: "桑葚", nectarines: "油桃",
  oranges: "柳橙", papayas: "木瓜", peaches: "桃子", pears: "梨", persimmons: "柿子",
  pineapple: "鳳梨", plums: "李子", pomegranate: "石榴", raspberries: "覆盆莓",
  starfruit: "楊桃", strawberries: "草莓", tangerines: "橘子", watermelon: "西瓜",
  artichokes: "朝鮮薊", asparagus: "蘆筍", beets: "甜菜根", broccoli: "花椰菜",
  cabbage: "高麗菜", carrots: "紅蘿蔔", cauliflower: "白花椰菜", celery: "芹菜",
  cucumber: "小黃瓜", eggplant: "茄子", garlic: "大蒜", kale: "羽衣甘藍",
  mushrooms: "蘑菇", okra: "秋葵", onions: "洋蔥", peas: "豌豆", peppers: "甜椒",
  potatoes: "馬鈴薯", pumpkin: "南瓜", radishes: "蘿蔔", spinach: "菠菜",
  squash: "南瓜", tomatoes: "番茄", turnips: "蕪菁", seaweed: "海藻",
  beans: "豆類", chickpeas: "鷹嘴豆", lentils: "扁豆", soybeans: "黃豆",
  almonds: "杏仁", cashew: "腰果", hazelnuts: "榛果", peanuts: "花生",
  pistachio: "開心果", walnuts: "核桃", rice: "米飯", oats: "燕麥", quinoa: "藜麥",
  barley: "大麥", millet: "小米", pasta: "義大利麵", noodles: "麵條",
  chicken: "雞肉", turkey: "火雞肉", pork: "豬肉", beef: "牛肉", lamb: "羊肉",
  fish: "魚", salmon: "鮭魚", tuna: "鮪魚", shrimp: "蝦", crab: "螃蟹",
  lobster: "龍蝦", clams: "蛤蜊", oysters: "牡蠣", milk: "牛奶", cheese: "起司",
  yogurt: "優格", egg: "雞蛋", tofu: "豆腐", oil: "油", butter: "奶油",
  honey: "蜂蜜", coffee: "咖啡", tea: "茶",
}));

const categoryMap = new Map([
  ["Vegetables and Vegetable Products", "veg"], ["Fruits and Fruit Juices", "fruit"],
  ["Legumes and Legume Products", "veg"], ["Nut and Seed Products", "snack"],
  ["Cereal Grains and Pasta", "carb"], ["Spices and Herbs", "sauce"],
  ["Dairy and Egg Products", "dairy"], ["Finfish and Shellfish Products", "protein"],
  ["Poultry Products", "protein"], ["Pork Products", "protein"], ["Beef Products", "protein"],
  ["Lamb, Veal, and Game Products", "protein"], ["Fats and Oils", "fat"],
  ["Soups, Sauces, and Gravies", "sauce"], ["Baked Products", "carb"],
  ["Sausages and Luncheon Meats", "protein"], ["Beverages", "drink"],
  ["Breakfast Cereals", "carb"], ["Sweets", "snack"], ["Snacks", "snack"],
  ["Meals, Entrees, and Side Dishes", "other"],
]);

function nutrients(food) {
  const values = new Map(food.foodNutrients.map((entry) => [entry.nutrient.id, entry.amount]));
  return [values.get(1008), values.get(1003), values.get(1005), values.get(1004)];
}

function cleanDescription(description) {
  return description
    .replace(/\s*\(Includes foods[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayName(description) {
  const clean = cleanDescription(description);
  const [rawBase, ...rawDetails] = clean.split(",").map((part) => part.trim()).filter(Boolean);
  const details = [...rawDetails];
  let base = ({ litchis: "Lychee", mangos: "Mangoes" })[rawBase.toLowerCase()] ?? rawBase;
  if (rawBase.toLowerCase() === "game meat" && details[0]?.toLowerCase() === "deer") {
    base = "Venison";
    details.shift();
  } else if (["mollusks", "crustaceans", "fish"].includes(rawBase.toLowerCase()) && details[0]) {
    base = details.shift().replace(/^./, (letter) => letter.toUpperCase());
  }
  return details.length ? `${base} (${details.join(", ")})` : base;
}

function chineseName(description, fallback) {
  const clean = cleanDescription(description);
  const [base, ...details] = clean.split(",").map((part) => part.trim()).filter(Boolean);
  const translated = translatedBases.get(base.toLowerCase());
  if (!translated) return fallback;
  if (!details.length) return translated;
  const state = details.slice(0, 2).join(", ")
    .replace(/raw/gi, "生")
    .replace(/cooked/gi, "熟")
    .replace(/boiled/gi, "水煮")
    .replace(/frozen/gi, "冷凍")
    .replace(/canned/gi, "罐頭")
    .replace(/dried/gi, "乾燥")
    .replace(/with salt/gi, "加鹽")
    .replace(/without salt/gi, "無鹽");
  return `${translated}（${state}）`;
}

function qualityScore(food) {
  const text = food.description.toLowerCase();
  let score = 200 - text.length;
  if (/\b(raw|fresh|cooked|boiled|baked|roasted|dried|frozen|canned)\b/.test(text)) score += 35;
  if (/\b(restaurant|fast food|school|commodity|babyfood|imitation|formulated)\b/.test(text)) score -= 90;
  if (/\bwith added\b|\bprepared from recipe\b|\bnot further specified\b/.test(text)) score -= 35;
  if (/[A-Z]{4,}/.test(food.description)) score -= 25;
  return score;
}

function portion(food) {
  const options = (food.foodPortions || [])
    .filter((item) => item.amount === 1 && item.gramWeight >= 5 && item.gramWeight <= 500)
    .map((item) => {
      const modifier = String(item.modifier || item.measureUnit?.name || "serving").trim();
      const low = modifier.toLowerCase();
      let score = 0;
      if (/\bmedium\b/.test(low)) score += 110;
      if (/\bcup\b/.test(low)) score += 100;
      if (/\b(slice|piece|fruit|fillet|egg|patty|link|stalk|wedge)\b/.test(low)) score += 80;
      if (/\b(tbsp|tablespoon|tsp|teaspoon)\b/.test(low)) score += 70;
      if (/\bsmall\b/.test(low)) score += 55;
      if (/\b(nlea|package|recipe|yield|quart|pound|lb)\b/.test(low)) score -= 100;
      score -= item.gramWeight / 100;
      return { modifier, grams: item.gramWeight, score };
    })
    .filter((item) => item.modifier.length <= 55 && !/\byield from\b/i.test(item.modifier))
    .sort((a, b) => b.score - a.score || a.grams - b.grams);
  const best = options[0];
  return best
    ? { en: `1 ${best.modifier}`, zh: `1 ${best.modifier}`, grams: best.grams }
    : { en: "100 g portion", zh: "100 克份量", grams: 100 };
}

function emojiFor(name, category) {
  const low = name.toLowerCase();
  const keywords = [
    [/mango/, "🥭"], [/apple/, "🍎"], [/banana/, "🍌"], [/orange|tangerine/, "🍊"],
    [/lemon|lime/, "🍋"], [/grape/, "🍇"], [/watermelon/, "🍉"], [/melon/, "🍈"],
    [/strawberr|raspberr|blueberr|blackberr/, "🫐"], [/cherr/, "🍒"], [/peach|nectarine/, "🍑"],
    [/pear/, "🍐"], [/pineapple/, "🍍"], [/avocado/, "🥑"], [/coconut/, "🥥"],
    [/tomato/, "🍅"], [/potato/, "🥔"], [/carrot/, "🥕"], [/corn/, "🌽"],
    [/broccoli/, "🥦"], [/pepper|chili/, "🌶️"], [/mushroom/, "🍄"], [/onion|garlic/, "🧅"],
    [/cucumber|pickle/, "🥒"], [/leaf|spinach|lettuce|cabbage|kale/, "🥬"], [/bean|pea|lentil/, "🫘"],
    [/rice/, "🍚"], [/noodle|pasta|spaghetti/, "🍝"], [/bread|roll|bun/, "🍞"], [/oat|cereal/, "🥣"],
    [/chicken|turkey|poultry/, "🍗"], [/beef|steak|veal|lamb|pork/, "🥩"], [/bacon/, "🥓"],
    [/fish|salmon|tuna|cod|trout/, "🐟"], [/shrimp/, "🦐"], [/crab/, "🦀"], [/lobster/, "🦞"],
    [/egg/, "🥚"], [/milk|cream/, "🥛"], [/cheese/, "🧀"], [/coffee/, "☕"], [/tea/, "🍵"],
  ];
  for (const [pattern, emoji] of keywords) if (pattern.test(low)) return emoji;
  return { protein: "🥩", carb: "🌾", veg: "🥬", fruit: "🍓", dairy: "🥛", fat: "🫒", drink: "🥤", snack: "🥜", sauce: "🫙", other: "🍽️" }[category];
}

const selected = [];
for (const [category, cap] of categoryCaps) {
  const candidates = sourceFoods
    .filter((food) => food.foodCategory?.description === category)
    .map((food) => ({ food, macros: nutrients(food) }))
    .filter(({ food, macros }) => {
      const [cal, protein, carbs, fat] = macros;
      return food.description.length <= 190
        && macros.every(Number.isFinite)
        && cal >= 0 && cal <= 900
        && protein >= 0 && carbs >= 0 && fat >= 0
        && protein + carbs + fat <= 105;
    })
    .sort((a, b) => qualityScore(b.food) - qualityScore(a.food) || a.food.fdcId - b.food.fdcId)
    .slice(0, cap);
  selected.push(...candidates);
}

const seen = new Set();
const tuples = [];
for (const { food, macros } of selected) {
  const en = displayName(food.description);
  const dedupeKey = en.toLowerCase();
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);
  const cat = categoryMap.get(food.foodCategory.description);
  const serving = portion(food);
  const round1 = (value) => Math.round(value * 10) / 10;
  tuples.push([
    food.fdcId, en, chineseName(food.description, en), emojiFor(en, cat), cat,
    Math.round(macros[0]), round1(macros[1]), round1(macros[2]), round1(macros[3]),
    serving.en, serving.zh, serving.grams,
  ]);
}

tuples.sort((a, b) => a[1].localeCompare(b[1]) || a[0] - b[0]);
fs.writeFileSync(output, `${JSON.stringify(tuples)}\n`);
console.log(`Wrote ${tuples.length} USDA foods to ${output}`);
