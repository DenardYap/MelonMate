import type { FoodItem } from "./types";
import generatedFoodData from "./foods.generated.json";
import fnddsFoodData from "./foods.fndds.generated.json";
import { FOOD_ALIAS_OVERLAYS, LONG_TAIL_FOODS } from "./foods.longtail";
import tfdaFoodData from "./foods.tfda.generated.json";

/**
 * Built-in bilingual food library.
 * Macros are typical per-100g values.
 */
function f(
  id: string,
  en: string,
  zh: string,
  emoji: string,
  cat: FoodItem["cat"],
  cal: number,
  protein: number,
  carbs: number,
  fat: number,
  opts?: {
    servingEn?: string;
    servingZh?: string;
    servingG?: number;
    servingUnits?: number;
    unitEn?: string;
    unitZh?: string;
  }
): FoodItem {
  return {
    id,
    name: { en, zh },
    emoji,
    cat,
    per100: { cal, protein, carbs, fat },
    serving:
      opts?.servingG != null
        ? {
            label: { en: opts.servingEn ?? "1 serving", zh: opts.servingZh ?? "1 份" },
            grams: opts.servingG,
            unitCount: opts.servingUnits,
            unitLabel: opts.unitEn || opts.unitZh
              ? { en: opts.unitEn ?? "1 item", zh: opts.unitZh ?? "1 個" }
              : undefined,
          }
        : undefined,
  };
}

const CURATED_FOODS: FoodItem[] = [
  // ---- proteins
  f("chicken-breast", "Chicken breast", "雞胸肉", "🍗", "protein", 120, 22.5, 0, 2.6, { servingEn: "150 g portion", servingZh: "150 克份量", servingG: 150 }),
  f("chicken-thigh", "Chicken thigh (skinless)", "去皮雞腿肉", "🍗", "protein", 121, 19.7, 0, 4.1, { servingEn: "1 thigh", servingZh: "1 隻", servingG: 149 }),
  f("chicken-wings", "Chicken wings", "雞翅", "🍗", "protein", 191, 17.5, 0, 12.8, { servingEn: "3 wings", servingZh: "3 隻", servingG: 90, servingUnits: 3, unitEn: "1 wing", unitZh: "1 隻" }),
  f("pork-chop", "Pork chop", "豬排", "🥩", "protein", 231, 23.7, 0, 14.6, { servingEn: "1 chop", servingZh: "1 片", servingG: 150 }),
  f("pork-belly", "Pork belly", "五花肉", "🥓", "protein", 518, 9.3, 0, 53, { servingG: 100, servingEn: "1 portion", servingZh: "1 份" }),
  f("ground-pork", "Ground pork", "豬絞肉", "🥩", "protein", 263, 16.9, 0, 21.2, { servingEn: "100 g portion", servingZh: "100 克份量", servingG: 100 }),
  f("beef-sirloin", "Sirloin steak", "沙朗牛排", "🥩", "protein", 201, 26, 0, 10, { servingEn: "1 steak", servingZh: "1 塊", servingG: 200 }),
  f("ground-beef", "Ground beef (80% lean)", "牛絞肉（80% 瘦肉）", "🥩", "protein", 254, 17.2, 0, 20, { servingEn: "100 g portion", servingZh: "100 克份量", servingG: 100 }),
  f("salmon", "Salmon fillet", "鮭魚", "🐟", "protein", 208, 20, 0, 13, { servingEn: "1 fillet", servingZh: "1 片", servingG: 150 }),
  f("shrimp", "Shrimp (cooked)", "熟蝦仁", "🦐", "protein", 99, 24, 0.2, 0.3, { servingEn: "6 large shrimp", servingZh: "6 隻大蝦", servingG: 85, servingUnits: 6, unitEn: "1 large shrimp", unitZh: "1 隻大蝦" }),
  f("egg", "Egg", "雞蛋", "🥚", "protein", 143, 12.6, 0.7, 9.5, { servingEn: "1 large egg", servingZh: "1 顆大雞蛋", servingG: 50 }),
  f("egg-white", "Egg white", "蛋白", "🥚", "protein", 52, 10.9, 0.7, 0.2, { servingEn: "1 white", servingZh: "1 顆", servingG: 33 }),
  f("tofu-firm", "Firm tofu", "板豆腐", "🧊", "protein", 76, 8.1, 1.9, 4.8, { servingEn: "half box", servingZh: "半盒", servingG: 150 }),
  f("chinese-sausage", "Chinese sausage", "香腸／臘腸", "🌭", "protein", 393, 17, 8, 32, { servingEn: "1 link", servingZh: "1 條", servingG: 40 }),
  f("fish-balls", "Fish balls", "魚丸", "🍥", "protein", 130, 11, 12, 3.5, { servingEn: "4 balls", servingZh: "4 顆", servingG: 80, servingUnits: 4, unitEn: "1 ball", unitZh: "1 顆" }),
  f("naruto", "Narutomaki (fish cake)", "鳴門卷", "🍥", "protein", 90, 8, 12, 0.9, { servingEn: "3 slices", servingZh: "3 片", servingG: 30, servingUnits: 3, unitEn: "1 slice", unitZh: "1 片" }),
  f("whey", "Whey protein (1 scoop)", "乳清蛋白（1 匙）", "🥤", "protein", 400, 80, 8, 6, { servingEn: "1 scoop", servingZh: "1 匙", servingG: 32 }),
  f("bacon", "Bacon (cooked)", "熟培根", "🥓", "protein", 541, 37, 1.4, 41.8, { servingEn: "2 slices", servingZh: "2 片", servingG: 16, servingUnits: 2, unitEn: "1 slice", unitZh: "1 片" }),
  f("ham", "Ham slice", "火腿片", "🍖", "protein", 145, 18, 1.5, 7.5, { servingEn: "2 slices", servingZh: "2 片", servingG: 40, servingUnits: 2, unitEn: "1 slice", unitZh: "1 片" }),

  // ---- carbs
  f("white-rice", "White rice (cooked)", "白飯", "🍚", "carb", 130, 2.7, 28, 0.3, { servingEn: "1 bowl", servingZh: "1 碗", servingG: 200 }),
  f("sesame-rice", "Sesame rice (cooked)", "芝麻飯", "🍚", "carb", 145, 3, 28.5, 2, { servingEn: "1 bowl", servingZh: "1 碗", servingG: 200 }),
  f("brown-rice", "Brown rice (cooked)", "糙米飯", "🍚", "carb", 123, 2.7, 25.6, 1, { servingEn: "1 bowl", servingZh: "1 碗", servingG: 200 }),
  f("udon", "Udon noodles (cooked)", "烏龍麵", "🍜", "carb", 127, 3.1, 25.5, 0.6, { servingEn: "1 pack", servingZh: "1 包", servingG: 200 }),
  f("ramen-noodles", "Ramen noodles (cooked)", "拉麵", "🍜", "carb", 149, 4.8, 27.9, 1.9, { servingEn: "1 portion", servingZh: "1 份", servingG: 180 }),
  f("cup-noodles", "Cup noodles", "杯麵", "🥡", "carb", 435, 9, 57, 18.5, { servingEn: "1 cup", servingZh: "1 杯", servingG: 75 }),
  f("jajang-noodles", "Wheat noodles (cooked)", "麵條（熟）", "🍜", "carb", 138, 4.5, 27, 0.8, { servingEn: "1 portion", servingZh: "1 份", servingG: 200 }),
  f("pasta", "Pasta (cooked)", "義大利麵（熟）", "🍝", "carb", 157, 5.8, 30.7, 0.9, { servingEn: "1 portion", servingZh: "1 份", servingG: 180 }),
  f("bread-white", "White bread", "白吐司", "🍞", "carb", 265, 9, 49, 3.2, { servingEn: "1 slice", servingZh: "1 片", servingG: 30 }),
  f("bread-sourdough", "Sourdough bread", "酸種麵包", "🍞", "carb", 240, 9.5, 47, 1.5, { servingEn: "1 slice", servingZh: "1 片", servingG: 45 }),
  f("baguette", "Garlic bread baguette", "法國麵包", "🥖", "carb", 274, 9, 52, 3, { servingEn: "1/4 loaf", servingZh: "1/4 條", servingG: 60 }),
  f("potato", "Potato", "馬鈴薯", "🥔", "carb", 77, 2, 17, 0.1, { servingEn: "1 medium", servingZh: "1 顆中型", servingG: 213 }),
  f("sweet-potato", "Sweet potato", "地瓜", "🍠", "carb", 86, 1.6, 20, 0.1, { servingEn: "1 medium", servingZh: "1 條中型", servingG: 130 }),
  f("oats", "Oats (dry)", "燕麥片", "🥣", "carb", 379, 13.2, 67.7, 6.5, { servingEn: "1/2 cup", servingZh: "半杯", servingG: 40 }),
  f("curry-roux", "Japanese curry roux", "日式咖哩塊", "🍛", "sauce", 475, 6, 45, 31, { servingEn: "1 cube", servingZh: "1 塊", servingG: 20 }),
  f("jajang-sauce", "Black bean sauce (jajang)", "炸醬（春醬）", "🥫", "sauce", 180, 5, 22, 8, { servingEn: "1 serving", servingZh: "1 份", servingG: 60 }),

  // ---- veg
  f("green-beans", "Green beans", "四季豆", "🫛", "veg", 31, 1.8, 7, 0.1, { servingEn: "1 cup", servingZh: "1 碗", servingG: 100 }),
  f("green-peas", "Green peas", "豌豆", "🫛", "veg", 81, 5.4, 14.5, 0.4, { servingEn: "1 cup", servingZh: "1 杯", servingG: 145 }),
  f("broccoli", "Broccoli", "花椰菜", "🥦", "veg", 34, 2.8, 6.6, 0.4, { servingEn: "1 cup", servingZh: "1 碗", servingG: 90 }),
  f("spinach", "Spinach", "菠菜", "🥬", "veg", 23, 2.9, 3.6, 0.4, { servingEn: "1 cup", servingZh: "1 杯", servingG: 30 }),
  f("cabbage", "Cabbage", "高麗菜", "🥬", "veg", 25, 1.3, 5.8, 0.1, { servingEn: "1 cup", servingZh: "1 碗", servingG: 90 }),
  f("bok-choy", "Bok choy", "青江菜", "🥬", "veg", 13, 1.5, 2.2, 0.2, { servingEn: "1 cup shredded", servingZh: "1 杯切絲", servingG: 70 }),
  f("mushroom", "Mushrooms", "蘑菇／香菇", "🍄", "veg", 22, 3.1, 3.3, 0.3, { servingEn: "1 cup", servingZh: "1 碗", servingG: 70 }),
  f("onion", "Onion", "洋蔥", "🧅", "veg", 40, 1.1, 9.3, 0.1, { servingEn: "1 medium", servingZh: "1 顆", servingG: 110 }),
  f("green-onion", "Green onion", "蔥", "🧅", "veg", 32, 1.8, 7.3, 0.2, { servingEn: "1 stalk", servingZh: "1 根", servingG: 15 }),
  f("carrot", "Carrot", "紅蘿蔔", "🥕", "veg", 41, 0.9, 9.6, 0.2, { servingEn: "1 medium", servingZh: "1 根", servingG: 60 }),
  f("tomato", "Tomato", "番茄", "🍅", "veg", 18, 0.9, 3.9, 0.2, { servingEn: "1 medium", servingZh: "1 顆", servingG: 120 }),
  f("cucumber", "Cucumber", "小黃瓜", "🥒", "veg", 15, 0.7, 3.6, 0.1, { servingEn: "1/2 cup sliced", servingZh: "半杯切片", servingG: 52 }),
  f("corn", "Sweet corn", "玉米粒", "🌽", "veg", 86, 3.3, 19, 1.4, { servingEn: "1/2 cup", servingZh: "半碗", servingG: 80 }),
  f("napa", "Napa cabbage", "大白菜", "🥬", "veg", 16, 1.2, 3.2, 0.2, { servingEn: "1 cup shredded", servingZh: "1 杯切絲", servingG: 76 }),

  // ---- fruit
  f("banana", "Banana", "香蕉", "🍌", "fruit", 89, 1.1, 22.8, 0.3, { servingEn: "1 banana", servingZh: "1 根", servingG: 118 }),
  f("apple", "Apple", "蘋果", "🍎", "fruit", 52, 0.3, 13.8, 0.2, { servingEn: "1 apple", servingZh: "1 顆", servingG: 180 }),
  f("mango", "Mango", "芒果", "🥭", "fruit", 60, 0.8, 15, 0.4, { servingEn: "1 cup pieces", servingZh: "1 杯切塊", servingG: 165 }),
  f("rambutan", "Rambutan", "紅毛丹", "🔴", "fruit", 75, 1, 16.3, 0.4, { servingEn: "100 g portion", servingZh: "100 克份量", servingG: 100 }),
  f("honeydew", "Honeydew melon", "哈密瓜（蜜瓜）", "🍈", "fruit", 36, 0.5, 9.1, 0.1, { servingEn: "1 large wedge", servingZh: "1 片大片", servingG: 160 }),
  f("cantaloupe", "Cantaloupe", "香瓜", "🍈", "fruit", 34, 0.8, 8.2, 0.2, { servingEn: "1 cup cubed", servingZh: "1 杯切塊", servingG: 160 }),
  f("watermelon", "Watermelon", "西瓜", "🍉", "fruit", 30, 0.6, 7.6, 0.2, { servingEn: "1 slice", servingZh: "1 片", servingG: 280 }),
  f("blueberry", "Blueberries", "藍莓", "🫐", "fruit", 57, 0.7, 14.5, 0.3, { servingEn: "1/2 cup", servingZh: "半杯", servingG: 74 }),
  f("strawberry", "Strawberries", "草莓", "🍓", "fruit", 32, 0.7, 7.7, 0.3, { servingEn: "5 medium berries", servingZh: "5 顆中型", servingG: 60, servingUnits: 5, unitEn: "1 medium berry", unitZh: "1 顆中型" }),
  f("avocado", "Avocado", "酪梨", "🥑", "fruit", 160, 2, 8.5, 14.7, { servingEn: "1/2 small avocado", servingZh: "半顆小型", servingG: 70 }),
  f("grapes", "Grapes", "葡萄", "🍇", "fruit", 69, 0.7, 18.1, 0.2, { servingEn: "1 cup", servingZh: "1 杯", servingG: 151 }),

  // ---- dairy
  f("milk", "Whole milk", "全脂鮮奶", "🥛", "dairy", 61, 3.2, 4.8, 3.3, { servingEn: "1 cup", servingZh: "1 杯", servingG: 244 }),
  f("greek-yogurt", "Greek yogurt", "希臘優格", "🥛", "dairy", 59, 10, 3.6, 0.4, { servingEn: "1 cup", servingZh: "1 杯", servingG: 170 }),
  f("yogurt", "Yogurt (plain)", "優格", "🥛", "dairy", 61, 3.5, 4.7, 3.3, { servingEn: "1 cup", servingZh: "1 杯", servingG: 150 }),
  f("cheese", "Cheddar cheese", "起司片", "🧀", "dairy", 403, 22.9, 3.4, 33.3, { servingEn: "1 slice (1 oz)", servingZh: "1 片（1 盎司）", servingG: 28 }),
  f("parmesan", "Parmesan", "帕瑪森起司", "🧀", "dairy", 431, 38.5, 4.1, 29, { servingEn: "2 tbsp", servingZh: "2 匙", servingG: 10, servingUnits: 2, unitEn: "1 tbsp", unitZh: "1 匙" }),
  f("mozzarella", "Mozzarella", "莫札瑞拉起司", "🧀", "dairy", 280, 28, 3.1, 17, { servingEn: "1/4 cup", servingZh: "1/4 杯", servingG: 28 }),
  f("cream", "Heavy cream", "鮮奶油", "🥛", "dairy", 340, 2.8, 2.8, 36, { servingEn: "2 tbsp", servingZh: "2 匙", servingG: 30, servingUnits: 2, unitEn: "1 tbsp", unitZh: "1 匙" }),
  f("butter", "Butter", "奶油", "🧈", "fat", 717, 0.9, 0.1, 81, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 14 }),
  f("soymilk", "Soy milk (unsweetened)", "無糖豆漿", "🥛", "dairy", 33, 3.3, 1.2, 1.6, { servingEn: "1 glass", servingZh: "1 杯", servingG: 240 }),

  // ---- fats & sauces
  f("olive-oil", "Olive oil", "橄欖油", "🫒", "fat", 884, 0, 0, 100, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 14 }),
  f("sesame-oil", "Sesame oil", "麻油", "🫙", "fat", 884, 0, 0, 100, { servingEn: "1 tsp", servingZh: "1 小匙", servingG: 5 }),
  f("mayo", "Mayonnaise", "美乃滋", "🥫", "fat", 680, 1, 2.7, 74, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 15 }),
  f("peanut-butter", "Peanut butter", "花生醬", "🥜", "fat", 588, 25, 20, 50, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 16 }),
  f("pesto", "Pesto sauce", "青醬", "🥫", "sauce", 418, 4.5, 6, 42, { servingEn: "2 tbsp", servingZh: "2 匙", servingG: 32, servingUnits: 2, unitEn: "1 tbsp", unitZh: "1 匙" }),
  f("tomato-sauce", "Tomato pasta sauce", "紅醬", "🥫", "sauce", 60, 1.5, 9, 2, { servingEn: "1/2 cup", servingZh: "半杯", servingG: 120 }),
  f("alfredo-sauce", "Alfredo sauce", "白醬", "🥫", "sauce", 190, 3, 5, 18, { servingEn: "1/2 cup", servingZh: "半杯", servingG: 120 }),
  f("soy-sauce", "Soy sauce", "醬油", "🫙", "sauce", 53, 8, 4.9, 0.6, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 16 }),
  f("dashi", "Dashi broth", "日式高湯", "🍲", "sauce", 8, 1, 1, 0, { servingEn: "1 bowl", servingZh: "1 碗", servingG: 300 }),
  f("mirin", "Mirin", "味醂", "🫙", "sauce", 226, 0.2, 43, 0, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 18 }),
  f("honey", "Honey", "蜂蜜", "🍯", "sauce", 304, 0.3, 82.4, 0, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 21 }),
  f("ketchup", "Ketchup", "番茄醬", "🥫", "sauce", 101, 1, 25, 0.1, { servingEn: "1 tbsp", servingZh: "1 匙", servingG: 17 }),

  // ---- snacks & drinks
  f("dark-chocolate", "Dark chocolate", "黑巧克力", "🍫", "snack", 546, 4.9, 61, 31, { servingEn: "2 squares", servingZh: "2 小格", servingG: 20, servingUnits: 2, unitEn: "1 square", unitZh: "1 小格" }),
  f("almonds", "Almonds", "杏仁", "🥜", "snack", 579, 21.2, 21.6, 49.9, { servingEn: "1 handful", servingZh: "1 把", servingG: 28 }),
  f("protein-bar", "Protein bar", "蛋白棒", "🍫", "snack", 380, 33, 40, 12, { servingEn: "1 bar", servingZh: "1 條", servingG: 60 }),
  f("bubble-tea", "Bubble milk tea", "珍珠奶茶", "🧋", "drink", 108, 0.8, 22, 2, { servingEn: "1 cup (M)", servingZh: "1 杯（中）", servingG: 500 }),
  f("black-coffee", "Black coffee", "黑咖啡", "☕", "drink", 1, 0.1, 0, 0, { servingEn: "1 cup", servingZh: "1 杯", servingG: 237 }),
  f("latte", "Latte", "拿鐵", "☕", "drink", 42, 2.2, 3.6, 2.2, { servingEn: "1 cup (M)", servingZh: "1 杯（中）", servingG: 360 }),
  f("coke-zero", "Coke Zero", "零卡可樂", "🥤", "drink", 0, 0, 0, 0, { servingEn: "1 can", servingZh: "1 罐", servingG: 330 }),
  f("beer", "Beer", "啤酒", "🍺", "drink", 43, 0.5, 3.6, 0, { servingEn: "1 can", servingZh: "1 罐", servingG: 330 }),
];

type GeneratedFoodTuple = [
  number, string, string, string, FoodItem["cat"],
  number, number, number, number, string, string, number,
];

const GENERATED_FOODS: FoodItem[] = (generatedFoodData as GeneratedFoodTuple[]).map(([
  fdcId, en, zh, emoji, cat, cal, protein, carbs, fat, servingEn, servingZh, servingG,
]) => ({
  id: `usda-${fdcId}`,
  name: { en, zh },
  emoji,
  cat,
  per100: { cal, protein, carbs, fat },
  serving: { label: { en: servingEn, zh: servingZh }, grams: servingG },
  source: { name: "USDA FoodData Central", id: String(fdcId) },
}));

type ExpandedFoodTuple = [
  string | number, string, string, string, FoodItem["cat"],
  number, number, number, number, string, string, number,
  number | null, number | null, number | null, string[] | null,
];

function expandedFoods(
  data: ExpandedFoodTuple[],
  idPrefix: string,
  sourceName: string
): FoodItem[] {
  return data.map(([
    sourceId, en, zh, emoji, cat, cal, protein, carbs, fat,
    servingEn, servingZh, servingG, fiber, sugar, sodiumMg, aliases,
  ]) => ({
    id: `${idPrefix}-${sourceId}`,
    name: { en, zh },
    aliases: aliases ?? undefined,
    emoji,
    cat,
    per100: {
      cal,
      protein,
      carbs,
      fat,
      fiber: fiber ?? undefined,
      sugar: sugar ?? undefined,
      sodiumMg: sodiumMg ?? undefined,
    },
    serving: { label: { en: servingEn, zh: servingZh }, grams: servingG },
    source: { name: sourceName, id: String(sourceId) },
  }));
}

const FNDDS_FOODS = expandedFoods(
  fnddsFoodData as ExpandedFoodTuple[],
  "fndds",
  "USDA FNDDS 2021–2023"
);
const TFDA_FOODS = expandedFoods(
  tfdaFoodData as ExpandedFoodTuple[],
  "tfda",
  "Taiwan FDA Food Nutrition Database"
);

function applyAliasOverlays(foods: FoodItem[]): FoodItem[] {
  return foods.map((food) => {
    const overlay = FOOD_ALIAS_OVERLAYS[food.id];
    if (!overlay) return food;
    return { ...food, aliases: [...new Set([...(food.aliases ?? []), ...overlay])] };
  });
}

function dedupeFoods(foods: FoodItem[]): FoodItem[] {
  const indexByName = new Map<string, number>();
  const result: FoodItem[] = [];
  for (const food of foods) {
    const key = `${food.name.en.trim().toLowerCase()}|${food.name.zh.trim().toLowerCase()}`;
    const existingIndex = indexByName.get(key);
    if (existingIndex == null) {
      indexByName.set(key, result.length);
      result.push(food);
      continue;
    }
    const existing = result[existingIndex];
    const aliases = [...new Set([...(existing.aliases ?? []), ...(food.aliases ?? [])])];
    if (aliases.length) result[existingIndex] = { ...existing, aliases };
  }
  return result;
}

export const BUILTIN_FOODS: FoodItem[] = dedupeFoods(applyAliasOverlays([
  ...CURATED_FOODS,
  ...TFDA_FOODS,
  ...FNDDS_FOODS,
  ...GENERATED_FOODS,
  ...LONG_TAIL_FOODS,
]));

export function findBuiltinFood(id: string): FoodItem | undefined {
  return BUILTIN_FOODS.find((x) => x.id === id);
}
