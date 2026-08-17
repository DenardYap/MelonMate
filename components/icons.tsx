"use client";

import Image from "next/image";
import type { SVGProps } from "react";
import {
  Apple,
  AppleHalf,
  Barcode,
  BellNotification,
  BreadSlice,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  Chocolate,
  CircleSpark,
  CoffeeCup,
  Community,
  Copy,
  Cycling,
  Cutlery,
  Download,
  Droplet,
  EditPencil,
  Egg,
  FireFlame,
  Fish,
  FloppyDisk,
  Flower,
  Fridge,
  GlassHalf,
  GraphUp,
  Gym,
  HalfMoon,
  Heart,
  HomeSimple,
  Leaf,
  LightBulb,
  Lock,
  MagicWand,
  Medal,
  Microphone,
  Minus,
  MusicNote,
  NavArrowLeft,
  NavArrowDown,
  NavArrowRight,
  NavArrowUp,
  Package,
  PageEdit,
  Palette,
  PizzaSlice,
  Play,
  Plus,
  RefreshCircle,
  Running,
  ScanBarcode,
  Search,
  Settings,
  ShoppingBag,
  Soil,
  SoundHigh,
  SoundOff,
  Sparks,
  Star,
  Stretching,
  SunLight,
  Timer,
  Trash,
  Trophy,
  Upload,
  UserCircle,
  UserPlus,
  Vegan,
  WarningTriangle,
  Weight,
  Xmark,
  Yoga,
} from "iconoir-react";
import type { FoodCat, MealSlot, RecipeCat } from "@/lib/types";
import type { ThemeId } from "@/lib/types";
import { themeBrand } from "@/lib/themeBrand";

const ICONS = {
  home: HomeSimple,
  kitchen: Cutlery,
  cutlery: Cutlery,
  gym: Gym,
  running: Running,
  cycling: Cycling,
  yoga: Yoga,
  user: UserCircle,
  addUser: UserPlus,
  plus: Plus,
  close: Xmark,
  fire: FireFlame,
  goal: CircleSpark,
  edit: EditPencil,
  leaf: Leaf,
  camera: Camera,
  magic: MagicWand,
  spark: Sparks,
  search: Search,
  microphone: Microphone,
  water: Droplet,
  weight: Weight,
  save: FloppyDisk,
  check: Check,
  checkCircle: CheckCircle,
  warning: WarningTriangle,
  trash: Trash,
  calendar: Calendar,
  palette: Palette,
  lock: Lock,
  upload: Upload,
  download: Download,
  copy: Copy,
  friends: Community,
  refresh: RefreshCircle,
  medal: Medal,
  soil: Soil,
  shopping: ShoppingBag,
  idea: LightBulb,
  chart: GraphUp,
  star: Star,
  play: Play,
  timer: Timer,
  stretch: Stretching,
  package: Package,
  fruit: AppleHalf,
  apple: Apple,
  flower: Flower,
  trophy: Trophy,
  settings: Settings,
  scan: ScanBarcode,
  barcode: Barcode,
  bell: BellNotification,
  manual: PageEdit,
  sun: SunLight,
  moon: HalfMoon,
  coffee: CoffeeCup,
  bread: BreadSlice,
  fish: Fish,
  egg: Egg,
  vegan: Vegan,
  pizza: PizzaSlice,
  drink: GlassHalf,
  fridge: Fridge,
  heart: Heart,
  back: NavArrowLeft,
  next: NavArrowRight,
  up: NavArrowUp,
  down: NavArrowDown,
  minus: Minus,
  chocolate: Chocolate,
  music: MusicNote,
  sound: SoundHigh,
  mute: SoundOff,
} as const;

export type IconName = keyof typeof ICONS;

export const SELECTABLE_ICONS: { name: IconName; label: string; keywords: string }[] = [
  { name: "cutlery", label: "Meal", keywords: "food dish restaurant recipe" },
  { name: "spark", label: "Special", keywords: "favorite custom regular" },
  { name: "fish", label: "Fish", keywords: "seafood protein salmon" },
  { name: "egg", label: "Egg", keywords: "breakfast protein" },
  { name: "bread", label: "Bread", keywords: "toast carbs bakery" },
  { name: "pizza", label: "Pizza", keywords: "pasta italian meal" },
  { name: "vegan", label: "Vegetables", keywords: "vegan greens salad plant" },
  { name: "apple", label: "Fruit", keywords: "apple produce snack" },
  { name: "coffee", label: "Coffee", keywords: "drink morning cafe" },
  { name: "drink", label: "Drink", keywords: "glass milk juice beverage" },
  { name: "water", label: "Water", keywords: "drink hydration liquid" },
  { name: "chocolate", label: "Treat", keywords: "snack dessert sweet" },
  { name: "package", label: "Packaged", keywords: "product powder supplement container" },
  { name: "fridge", label: "Prepared food", keywords: "meal prep leftovers" },
  { name: "heart", label: "Favorite", keywords: "love healthy" },
  { name: "fire", label: "Hot", keywords: "spicy cooked grill" },
  { name: "sun", label: "Morning", keywords: "breakfast daily" },
  { name: "moon", label: "Evening", keywords: "dinner night" },
  { name: "leaf", label: "Fresh", keywords: "herbs vegetable healthy" },
  { name: "fruit", label: "Produce", keywords: "melon fruit" },
  { name: "goal", label: "Staple", keywords: "routine target regular" },
  { name: "star", label: "Star", keywords: "favorite signature" },
];

export function AppIcon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className = "",
  ...props
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "name">) {
  const Icon = ICONS[name];
  return (
    <Icon
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={`app-icon ${className}`}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}

const FOOD_ICONS: Record<FoodCat | RecipeCat, IconName> = {
  protein: "fish",
  carb: "bread",
  veg: "vegan",
  fruit: "apple",
  dairy: "drink",
  fat: "water",
  drink: "coffee",
  snack: "chocolate",
  sauce: "package",
  other: "cutlery" as IconName,
  asian: "cutlery" as IconName,
  western: "cutlery" as IconName,
  pasta: "pizza",
  breakfast: "egg",
  custom: "spark",
};

export function FoodGlyph({
  category,
  size = 22,
  compact = false,
}: {
  category: FoodCat | RecipeCat;
  size?: number;
  compact?: boolean;
}) {
  return (
    <span className={`food-glyph food-glyph-${category} ${compact ? "compact" : ""}`} aria-hidden="true">
      <AppIcon name={FOOD_ICONS[category]} size={size} />
    </span>
  );
}

export function SavedFoodGlyph({
  icon,
  category,
  size = 22,
  compact = false,
}: {
  icon?: string;
  category: FoodCat | RecipeCat;
  size?: number;
  compact?: boolean;
}) {
  const fallback = FOOD_ICONS[category];
  return (
    <span className={`food-glyph food-glyph-${category} ${compact ? "compact" : ""}`} aria-hidden="true">
      <AppIcon name={iconFromLegacy(icon, fallback)} size={size} />
    </span>
  );
}

const MEAL_ICONS: Record<MealSlot, IconName> = {
  breakfast: "sun",
  lunch: "apple",
  dinner: "moon",
  snack: "coffee",
};

export function MealGlyph({ meal, size = 18 }: { meal: MealSlot; size?: number }) {
  return <AppIcon name={MEAL_ICONS[meal]} size={size} />;
}

export function BrandMark({ size = 28, theme = "honeydew" }: { size?: number; theme?: ThemeId }) {
  const brand = themeBrand(theme);
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <Image
        src={brand.markSrc}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        loading="eager"
      />
    </span>
  );
}

const LEGACY_ICON_MAP: Record<string, IconName> = {
  "✅": "checkCircle",
  "⚠️": "warning",
  "🗑️": "trash",
  "💾": "save",
  "📥": "download",
  "📋": "copy",
  "📷": "camera",
  "🎙️": "microphone",
  "✨": "spark",
  "🍈": "fruit",
  "🍉": "fruit",
  "👋": "friends",
  "🏅": "medal",
  "🏋️": "gym",
  "💪": "gym",
  "🌱": "leaf",
  "💧": "water",
  "⚖️": "weight",
  "🎯": "goal",
  "🛒": "shopping",
  "🗓": "calendar",
  "🎉": "spark",
  "🔥": "fire",
  "🔒": "lock",
  "💡": "idea",
  "📈": "chart",
  "🥢": "cutlery" as IconName,
  "🍽️": "cutlery",
  "🍲": "cutlery",
  "🍛": "cutlery",
  "🍣": "fish",
  "🍗": "fish",
  "🥩": "fish",
  "🥓": "fish",
  "🍖": "fish",
  "🦐": "fish",
  "🐟": "fish",
  "🍥": "fish",
  "🌭": "fish",
  "🥚": "egg",
  "🧊": "package",
  "🍚": "bread",
  "🍜": "cutlery",
  "🥡": "package",
  "🍝": "pizza",
  "🍞": "bread",
  "🥖": "bread",
  "🥔": "bread",
  "🍠": "bread",
  "🥣": "cutlery",
  "🥫": "package",
  "🫛": "vegan",
  "🥦": "vegan",
  "🥬": "vegan",
  "🍄": "vegan",
  "🧅": "vegan",
  "🥕": "vegan",
  "🍅": "vegan",
  "🥒": "vegan",
  "🌽": "vegan",
  "🥗": "vegan",
  "🍌": "apple",
  "🍎": "apple",
  "🍏": "apple",
  "🫐": "apple",
  "🍓": "apple",
  "🥑": "apple",
  "🍇": "apple",
  "🥛": "drink",
  "🧀": "drink",
  "🧈": "drink",
  "🫒": "water",
  "🫙": "package",
  "🥜": "package",
  "🍫": "chocolate",
  "🧋": "coffee",
  "☕": "coffee",
  "🥤": "drink",
  "🍺": "drink",
};

export function iconFromLegacy(value?: string, fallback: IconName = "checkCircle"): IconName {
  if (value && value in ICONS) return value as IconName;
  return (value && LEGACY_ICON_MAP[value]) || fallback;
}
