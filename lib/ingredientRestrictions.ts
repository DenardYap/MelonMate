import type { BiText, FoodItem, Profile, Recipe } from "./types";

export interface RestrictionOption {
  value: string;
  label: BiText;
  aliases?: string[];
  group?: boolean;
}

const GROUPS: RestrictionOption[] = [
  { value: "nuts", label: { en: "Nuts", zh: "堅果" }, aliases: ["tree nuts", "peanuts", "堅果", "花生"], group: true },
  { value: "shellfish", label: { en: "Shellfish", zh: "甲殼類海鮮" }, aliases: ["crustaceans", "甲殼類", "貝類"], group: true },
  { value: "dairy", label: { en: "Dairy", zh: "乳製品" }, aliases: ["milk", "乳製品", "奶類"], group: true },
  { value: "eggs", label: { en: "Eggs", zh: "蛋類" }, aliases: ["egg", "蛋", "雞蛋"], group: true },
  { value: "soy", label: { en: "Soy", zh: "大豆" }, aliases: ["soybean", "soya", "大豆", "黃豆"], group: true },
  { value: "gluten", label: { en: "Gluten", zh: "麩質" }, aliases: ["wheat", "barley", "rye", "麩質", "小麥"], group: true },
  { value: "fish", label: { en: "Fish", zh: "魚類" }, aliases: ["魚", "魚類"], group: true },
  { value: "sesame", label: { en: "Sesame", zh: "芝麻" }, aliases: ["sesame seeds", "tahini", "芝麻"], group: true },
  { value: "alliums", label: { en: "Onion & garlic", zh: "蔥蒜類" }, aliases: ["allium", "onions", "garlic", "蔥蒜", "蔥蒜類"], group: true },
];

const GROUP_TERMS: Record<string, string[]> = {
  nuts: ["peanut", "almond", "cashew", "walnut", "pistachio", "pecan", "hazelnut", "macadamia", "pine nut", "nut butter", "花生", "杏仁", "腰果", "核桃", "開心果", "榛果", "松子"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "crayfish", "scallop", "clam", "mussel", "oyster", "蝦", "蟹", "龍蝦", "干貝", "蛤", "牡蠣"],
  dairy: ["milk", "butter", "cream", "cheese", "yogurt", "yoghurt", "whey", "paneer", "feta", "mozzarella", "parmesan", "ghee", "奶", "奶油", "鮮奶油", "起司", "優格", "乳清"],
  eggs: ["egg", "mayonnaise", "mayo", "雞蛋", "蛋黃", "蛋白", "美乃滋"],
  soy: ["soy", "soybean", "tofu", "tempeh", "edamame", "miso", "tamari", "豆腐", "天貝", "毛豆", "味噌", "醬油", "大豆", "黃豆"],
  gluten: ["wheat", "barley", "rye", "farro", "couscous", "bulgur", "seitan", "pasta", "orzo", "udon", "ramen", "noodle", "bread", "tortilla", "soy sauce", "小麥", "大麥", "麵", "麵包", "義大利麵", "醬油"],
  fish: ["fish", "salmon", "tuna", "cod", "mackerel", "sardine", "anchovy", "trout", "tilapia", "saba", "魚", "鮭魚", "鮪魚", "鱈魚", "鯖魚", "沙丁魚"],
  sesame: ["sesame", "tahini", "芝麻", "芝麻醬", "麻油"],
  alliums: ["onion", "garlic", "shallot", "scallion", "green onion", "leek", "chive", "洋蔥", "蒜", "紅蔥", "青蔥", "蔥", "韭菜"],
};

export function normalizeRestriction(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .trim();
}

function singularizeWords(value: string): string {
  return value
    .split(" ")
    .map((word) => (word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word))
    .join(" ");
}

function phraseMatches(rawHaystack: string, rawNeedle: string): boolean {
  const haystack = singularizeWords(normalizeRestriction(rawHaystack));
  const needle = singularizeWords(normalizeRestriction(rawNeedle));
  if (!needle) return false;
  if (/[^\u0000-\u007f]/.test(needle)) return haystack.includes(needle);
  return ` ${haystack} `.includes(` ${needle} `);
}

function termsForRestriction(restriction: string): string[] {
  const normalized = normalizeRestriction(restriction);
  const group = GROUPS.find((option) =>
    [option.value, option.label.en, option.label.zh, ...(option.aliases ?? [])]
      .some((candidate) => normalizeRestriction(candidate) === normalized)
  );
  return group ? GROUP_TERMS[group.value] : [restriction];
}

export function recipeMatchesRestrictions(recipe: Recipe, restrictions: string[]): boolean {
  if (!restrictions.length) return false;
  const ingredients = recipe.ingredients.map((ingredient) => `${ingredient.name.en} ${ingredient.name.zh}`);
  return restrictions.some((restriction) =>
    termsForRestriction(restriction).some((term) => ingredients.some((ingredient) => phraseMatches(ingredient, term)))
  );
}

export function restrictionsFromProfile(profile: Pick<Profile, "ingredientRestrictions" | "allergies">): string[] {
  if (profile.ingredientRestrictions?.length) return profile.ingredientRestrictions;
  return (profile.allergies ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildRestrictionOptions(foods: FoodItem[], recipes: Recipe[]): RestrictionOption[] {
  const options: RestrictionOption[] = [...GROUPS];
  const seen = new Set(options.flatMap((option) => [option.label.en, option.label.zh]).map(normalizeRestriction));

  const add = (label: BiText) => {
    const en = label.en.trim();
    const zh = label.zh.trim();
    const key = normalizeRestriction(en || zh);
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ value: en || zh, label: { en: en || zh, zh: zh || en } });
  };

  foods.forEach((food) => add(food.name));
  recipes.forEach((recipe) => recipe.ingredients.forEach((ingredient) => add(ingredient.name)));
  return options;
}

export function searchRestrictionOptions(options: RestrictionOption[], query: string, limit = 8): RestrictionOption[] {
  const normalized = normalizeRestriction(query);
  if (!normalized) return options.filter((option) => option.group).slice(0, limit);

  return options
    .map((option, index) => {
      const candidates = [option.label.en, option.label.zh, ...(option.aliases ?? [])].map(normalizeRestriction);
      const exact = candidates.some((candidate) => candidate === normalized);
      const prefix = candidates.some((candidate) => candidate.startsWith(normalized));
      const includes = candidates.some((candidate) => candidate.includes(normalized));
      return { option, index, score: exact ? 3 : prefix ? 2 : includes ? 1 : 0 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || Number(b.option.group) - Number(a.option.group) || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map(({ option }) => option);
}
