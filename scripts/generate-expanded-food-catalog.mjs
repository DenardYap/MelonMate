import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [tfdaInput, fnddsInput] = process.argv.slice(2);
if (!tfdaInput || !fnddsInput) {
  throw new Error("Usage: node scripts/generate-expanded-food-catalog.mjs <TFDA JSON> <USDA FNDDS JSON>");
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const round1 = (value) => Math.round(value * 10) / 10;
const optional = (value) => Number.isFinite(value) ? round1(value) : null;

function numeric(value) {
  if (value == null || value === "" || /^(?:tr|trace|微量)$/i.test(String(value).trim())) return 0;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function categoryEmoji(name, category) {
  const low = name.toLowerCase();
  const keywords = [
    [/pineapple|鳳梨/, "🍍"], [/mango|芒果/, "🥭"], [/apple|蘋果/, "🍎"], [/banana|香蕉/, "🍌"],
    [/orange|tangerine|柳橙|橘/, "🍊"], [/lemon|lime|檸檬/, "🍋"], [/grape|葡萄/, "🍇"],
    [/watermelon|西瓜/, "🍉"], [/melon|瓜/, "🍈"], [/berr|莓/, "🫐"], [/cherr|櫻桃/, "🍒"],
    [/peach|桃/, "🍑"], [/pear|梨/, "🍐"], [/avocado|酪梨/, "🥑"], [/coconut|椰/, "🥥"],
    [/tomato|番茄/, "🍅"], [/potato|馬鈴薯|地瓜/, "🥔"], [/carrot|紅蘿蔔/, "🥕"],
    [/corn|玉米/, "🌽"], [/broccoli|花椰菜/, "🥦"], [/pepper|chili|椒/, "🌶️"],
    [/mushroom|菇/, "🍄"], [/onion|garlic|洋蔥|蒜/, "🧅"], [/cucumber|小黃瓜/, "🥒"],
    [/rice|飯|米/, "🍚"], [/noodle|pasta|麵/, "🍜"], [/bread|toast|吐司|麵包/, "🍞"],
    [/cake|cookie|pie|pastry|糕|酥|餅/, "🍰"], [/chicken|turkey|雞/, "🍗"],
    [/beef|steak|veal|lamb|pork|牛|豬|羊/, "🥩"], [/fish|salmon|tuna|魚/, "🐟"],
    [/shrimp|蝦/, "🦐"], [/crab|蟹/, "🦀"], [/egg|蛋/, "🥚"], [/milk|cream|乳|奶/, "🥛"],
    [/cheese|起司/, "🧀"], [/coffee|咖啡/, "☕"], [/tea|茶/, "🍵"],
  ];
  for (const [pattern, emoji] of keywords) if (pattern.test(low)) return emoji;
  return { protein: "🥩", carb: "🌾", veg: "🥬", fruit: "🍓", dairy: "🥛", fat: "🫒", drink: "🥤", snack: "🍪", sauce: "🫙", other: "🍽️" }[category];
}

function tfdaCategory(value) {
  return {
    魚貝類: "protein", 肉類: "protein", 蛋類: "protein", 豆類: "protein",
    澱粉類: "carb", 穀物類: "carb", 蔬菜類: "veg", 菇類: "veg", 藻類: "veg",
    水果類: "fruit", 乳品類: "dairy", 油脂類: "fat", 飲料類: "drink",
    糕餅點心類: "snack", 堅果及種子類: "snack", 糖類: "snack",
    調味料及香辛料類: "sauce", 加工調理食品及其他類: "other",
  }[value] ?? "other";
}

function parseAliases(value) {
  return [...new Set(String(value ?? "").split(/[、,，;；/]/).map((item) => item.trim()).filter(Boolean))];
}

function tfdaCatalog(inputPath) {
  const rows = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
  const grouped = new Map();
  for (const row of rows) {
    const id = String(row["整合編號"] ?? "").trim();
    if (!id) continue;
    const food = grouped.get(id) ?? { meta: row, nutrients: new Map() };
    const value = numeric(row["每100克含量"]);
    if (value != null) food.nutrients.set(String(row["分析項"]), value);
    grouped.set(id, food);
  }

  const tuples = [];
  for (const [id, { meta, nutrients }] of grouped) {
    const energy = nutrients.get("修正熱量") ?? nutrients.get("熱量");
    const protein = nutrients.get("粗蛋白");
    const carbs = nutrients.get("總碳水化合物");
    const fat = nutrients.get("粗脂肪");
    if (![energy, protein, carbs, fat].every(Number.isFinite) || energy < 0 || energy > 950) continue;
    const zh = String(meta["樣品名稱"] ?? "").trim();
    const en = String(meta["樣品英文名稱"] ?? "").trim() || zh;
    if (!zh || !en) continue;
    const category = tfdaCategory(meta["食品分類"]);
    const unitGrams = numeric(String(meta["每單位重"] ?? "").replace(/克.*$/, ""));
    const servingGrams = unitGrams && unitGrams >= 5 && unitGrams <= 500 ? unitGrams : 100;
    const aliases = parseAliases(meta["俗名"]);
    if (id === "Q0500501") aliases.push("Taiwanese pineapple cake", "Pineapple shortcake", "Feng li su", "凤梨酥");
    tuples.push([
      id, en, zh, categoryEmoji(`${en} ${zh}`, category), category,
      Math.round(energy), round1(protein), round1(carbs), round1(fat),
      servingGrams === 100 ? "100 g portion" : `1 serving (${servingGrams} g)`,
      servingGrams === 100 ? "100 克份量" : `1 份（${servingGrams} 克）`,
      servingGrams,
      optional(nutrients.get("膳食纖維")), optional(nutrients.get("糖質總量")), optional(nutrients.get("鈉")),
      aliases.length ? [...new Set(aliases)] : null,
    ]);
  }
  return tuples.sort((a, b) => a[2].localeCompare(b[2], "zh-Hant") || a[0].localeCompare(b[0]));
}

function fnddsCategory(value) {
  const low = value.toLowerCase();
  if (/milk|cheese|yogurt|dairy|cream/.test(low)) return "dairy";
  if (/beverage|soft drink|coffee|tea|water|juice|alcohol/.test(low)) return "drink";
  if (/fruit/.test(low)) return "fruit";
  if (/vegetable|salad|mushroom/.test(low)) return "veg";
  if (/cake|cookie|pie|pastr|candy|sugar|dessert|snack|sweet|ice cream|frozen dessert/.test(low)) return "snack";
  if (/bread|grain|cereal|rice|pasta|noodle|potato|corn|tortilla/.test(low)) return "carb";
  if (/oil|fat|butter|margarine|shortening/.test(low)) return "fat";
  if (/sauce|dip|gravy|condiment|seasoning/.test(low)) return "sauce";
  if (/meat|poultry|seafood|fish|egg|legume|nut|seed|protein|sandwich|burger/.test(low)) return "protein";
  return "other";
}

function bestFnddsPortion(portions) {
  const ranked = (portions ?? [])
    .filter((item) => Number.isFinite(item.gramWeight) && item.gramWeight >= 5 && item.gramWeight <= 500)
    .map((item) => {
      const label = String(item.portionDescription || "").trim();
      const low = label.toLowerCase();
      let score = 0;
      if (/quantity not specified|nfs|undetermined/.test(low)) score -= 200;
      if (/1 (medium|cup|slice|piece|item|serving|bowl|plate|sandwich|bar|cookie|cake)/.test(low)) score += 120;
      if (/1 (tbsp|tablespoon|tsp|teaspoon|oz|fl oz)/.test(low)) score += 90;
      if (/small/.test(low)) score += 45;
      score -= label.length / 10;
      return { label, grams: round1(item.gramWeight), score };
    })
    .filter((item) => item.label && item.label.length <= 80)
    .sort((a, b) => b.score - a.score || a.grams - b.grams);
  return ranked[0] ?? { label: "100 g portion", grams: 100 };
}

function fnddsCatalog(inputPath) {
  const foods = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8")).SurveyFoods;
  const seen = new Set();
  const tuples = [];
  for (const food of foods) {
    const en = String(food.description ?? "").replace(/\s+/g, " ").trim();
    if (!en || seen.has(en.toLowerCase())) continue;
    const nutrients = new Map((food.foodNutrients ?? []).map((entry) => [entry.nutrient?.id, Number(entry.amount)]));
    const energy = nutrients.get(1008);
    const protein = nutrients.get(1003);
    const carbs = nutrients.get(1005);
    const fat = nutrients.get(1004);
    if (![energy, protein, carbs, fat].every(Number.isFinite) || energy < 0 || energy > 950) continue;
    seen.add(en.toLowerCase());
    const categoryDescription = food.wweiaFoodCategory?.wweiaFoodCategoryDescription || en;
    const category = fnddsCategory(categoryDescription);
    const serving = bestFnddsPortion(food.foodPortions);
    tuples.push([
      food.fdcId, en, en, categoryEmoji(en, category), category,
      Math.round(energy), round1(protein), round1(carbs), round1(fat),
      serving.label, serving.label, serving.grams,
      optional(nutrients.get(1079)), optional(nutrients.get(2000)), optional(nutrients.get(1093)), null,
    ]);
  }
  return tuples.sort((a, b) => a[1].localeCompare(b[1]) || a[0] - b[0]);
}

const tfda = tfdaCatalog(tfdaInput);
const fndds = fnddsCatalog(fnddsInput);
fs.writeFileSync(path.join(projectRoot, "lib", "foods.tfda.generated.json"), `${JSON.stringify(tfda)}\n`);
fs.writeFileSync(path.join(projectRoot, "lib", "foods.fndds.generated.json"), `${JSON.stringify(fndds)}\n`);
console.log(`Wrote ${tfda.length} Taiwan FDA foods and ${fndds.length} USDA FNDDS foods`);
