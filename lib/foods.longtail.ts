import type { FoodCat, FoodItem, Macros } from "./types";

type IngredientSpec = {
  name: string;
  zh: string;
  aliases?: string[];
  cat?: FoodCat;
  emoji?: string;
  macros: Macros;
  grams: number;
  serving: string;
  servingZh: string;
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function ingredient(spec: IngredientSpec): FoodItem {
  return {
    id: `longtail-${slug(spec.name)}`,
    name: { en: spec.name, zh: spec.zh },
    aliases: spec.aliases,
    emoji: spec.emoji ?? "🫙",
    cat: spec.cat ?? "other",
    per100: spec.macros,
    serving: { label: { en: spec.serving, zh: spec.servingZh }, grams: spec.grams },
    source: { name: "Long-tail ingredient reference" },
    nutritionEstimate: true,
    usageNote: {
      en: "Generic ingredient estimate; brands and preparations can vary.",
      zh: "通用食材估算值；品牌與製法可能不同。",
    },
  };
}

type AdditiveSpec = [name: string, zh: string, ins: string, aliases?: string[]];

function additive([name, zh, ins, aliases = []]: AdditiveSpec): FoodItem {
  const insAliases = ins
    ? [`INS ${ins}`, `INS${ins}`, `E${ins.toLowerCase().replace(/[()]/g, "")}`, `E ${ins}`]
    : [];
  return {
    id: `additive-${slug(name)}`,
    name: { en: name, zh },
    aliases: [...new Set([...aliases, ...insAliases])],
    emoji: "🧪",
    cat: "other",
    per100: { cal: 0, protein: 0, carbs: 0, fat: 0 },
    serving: { label: { en: "1 g trace use", zh: "1 克微量使用" }, grams: 1 },
    source: { name: "Food additive reference", id: ins ? `INS ${ins}` : undefined },
    traceIngredient: true,
    usageNote: {
      en: "Usually used in trace amounts; nutrition is treated as negligible at this logging amount. Rules vary by market.",
      zh: "通常僅微量使用；此記錄份量的營養視為可忽略。各地法規不同。",
    },
  };
}

const CULINARY_INGREDIENTS: FoodItem[] = [
  ingredient({ name: "Gelatin powder, unflavored", zh: "無味明膠粉", aliases: ["gelatin", "gelatine", "bovine gelatin", "porcine gelatin", "fish gelatin", "leaf gelatin", "gelatin sheets"], cat: "protein", emoji: "🟨", macros: { cal: 335, protein: 85.6, carbs: 0, fat: 0.1 }, grams: 9, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Agar powder", zh: "洋菜粉", aliases: ["agar", "agar agar", "kanten", "china grass", "vegetable gelatin"], macros: { cal: 306, protein: 6.2, carbs: 81, fat: 0.3, fiber: 7.7 }, grams: 2, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Arrowroot starch", zh: "葛粉", aliases: ["arrowroot powder", "arrowroot flour"], cat: "carb", emoji: "🌾", macros: { cal: 357, protein: 0.3, carbs: 88.2, fat: 0.1 }, grams: 8, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Tapioca starch", zh: "木薯澱粉", aliases: ["tapioca flour", "cassava starch", "manioc starch"], cat: "carb", emoji: "🌾", macros: { cal: 358, protein: 0.2, carbs: 88.7, fat: 0 }, grams: 8, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Potato starch", zh: "馬鈴薯澱粉", aliases: ["potato flour starch"], cat: "carb", emoji: "🥔", macros: { cal: 357, protein: 6.9, carbs: 83.1, fat: 0.3 }, grams: 12, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Glutinous rice flour", zh: "糯米粉", aliases: ["sweet rice flour", "mochiko", "sticky rice flour"], cat: "carb", emoji: "🍚", macros: { cal: 366, protein: 6, carbs: 80, fat: 1.4 }, grams: 10, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Vital wheat gluten", zh: "小麥麵筋粉", aliases: ["wheat gluten", "gluten flour", "seitan flour"], cat: "protein", emoji: "🌾", macros: { cal: 370, protein: 75, carbs: 14, fat: 1.9 }, grams: 30, serving: "1/4 cup", servingZh: "1/4 杯" }),
  ingredient({ name: "Maltodextrin", zh: "麥芽糊精", aliases: ["corn maltodextrin", "tapioca maltodextrin"], cat: "carb", emoji: "🥄", macros: { cal: 380, protein: 0, carbs: 95, fat: 0 }, grams: 10, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Dextrose", zh: "葡萄糖粉", aliases: ["d-glucose", "glucose powder", "corn sugar"], cat: "carb", emoji: "🥄", macros: { cal: 364, protein: 0, carbs: 91, fat: 0 }, grams: 4, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Inulin powder", zh: "菊糖粉", aliases: ["chicory root fiber", "chicory inulin", "fructan"], cat: "carb", emoji: "🥄", macros: { cal: 200, protein: 0, carbs: 89, fat: 0, fiber: 89 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Psyllium husk", zh: "洋車前子殼", aliases: ["ispaghula husk", "isabgol", "psyllium fiber"], cat: "carb", emoji: "🌾", macros: { cal: 200, protein: 2, carbs: 89, fat: 1, fiber: 78 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Nutritional yeast", zh: "營養酵母", aliases: ["nooch", "deactivated yeast"], cat: "protein", emoji: "🟨", macros: { cal: 325, protein: 40, carbs: 36, fat: 7.5 }, grams: 5, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Yeast extract", zh: "酵母抽出物", aliases: ["autolyzed yeast", "autolysed yeast", "hydrolyzed yeast", "marmite powder"], cat: "sauce", emoji: "🟤", macros: { cal: 185, protein: 23, carbs: 20, fat: 1 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Soy protein isolate", zh: "大豆分離蛋白", aliases: ["isolated soy protein", "ISP"], cat: "protein", emoji: "🥄", macros: { cal: 335, protein: 88, carbs: 3.4, fat: 3.4 }, grams: 30, serving: "1 scoop", servingZh: "1 匙" }),
  ingredient({ name: "Pea protein isolate", zh: "豌豆分離蛋白", aliases: ["pea protein powder"], cat: "protein", emoji: "🥄", macros: { cal: 380, protein: 80, carbs: 7, fat: 6 }, grams: 30, serving: "1 scoop", servingZh: "1 匙" }),
  ingredient({ name: "Powdered egg whites", zh: "蛋白粉", aliases: ["egg white powder", "albumen powder", "dried egg white"], cat: "protein", emoji: "🥚", macros: { cal: 382, protein: 81, carbs: 7.8, fat: 0 }, grams: 5, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Gochujang", zh: "韓式辣椒醬", aliases: ["Korean red pepper paste", "hot pepper paste"], cat: "sauce", emoji: "🌶️", macros: { cal: 229, protein: 5, carbs: 49, fat: 2 }, grams: 18, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Doenjang", zh: "韓式大醬", aliases: ["Korean soybean paste", "Korean fermented soybean paste"], cat: "sauce", emoji: "🟤", macros: { cal: 170, protein: 12, carbs: 19, fat: 6 }, grams: 18, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Doubanjiang", zh: "豆瓣醬", aliases: ["toban djan", "chili bean paste", "broad bean chili paste", "pixian doubanjiang"], cat: "sauce", emoji: "🌶️", macros: { cal: 178, protein: 7, carbs: 22, fat: 7 }, grams: 18, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Yuzu kosho", zh: "柚子胡椒", aliases: ["yuzu koshō", "yuzu chili paste"], cat: "sauce", emoji: "🍋", macros: { cal: 60, protein: 2, carbs: 10, fat: 1 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Shio koji", zh: "鹽麴", aliases: ["salt koji", "shiokoji", "rice koji seasoning"], cat: "sauce", emoji: "🍚", macros: { cal: 130, protein: 2.5, carbs: 26, fat: 0.5 }, grams: 15, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Tamarind paste", zh: "羅望子醬", aliases: ["tamarind concentrate", "imli paste", "asam jawa", "tamarindo paste"], cat: "sauce", emoji: "🟤", macros: { cal: 239, protein: 2.8, carbs: 62.5, fat: 0.6 }, grams: 15, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Kecap manis", zh: "印尼甜醬油", aliases: ["ketjap manis", "Indonesian sweet soy sauce", "sweet soy sauce"], cat: "sauce", emoji: "🫙", macros: { cal: 240, protein: 5, carbs: 55, fat: 0 }, grams: 18, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Yuzu juice", zh: "柚子汁", aliases: ["Japanese citrus juice"], cat: "sauce", emoji: "🍋", macros: { cal: 30, protein: 0.5, carbs: 7, fat: 0.1 }, grams: 15, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Pandan extract", zh: "班蘭香精", aliases: ["pandan essence", "screwpine extract", "pandan flavoring"], cat: "sauce", emoji: "🌿", macros: { cal: 20, protein: 0, carbs: 5, fat: 0 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Rose water", zh: "玫瑰水", aliases: ["rosewater", "gulab jal"], cat: "sauce", emoji: "🌹", macros: { cal: 0, protein: 0, carbs: 0, fat: 0 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Orange blossom water", zh: "橙花水", aliases: ["orange flower water", "mazaher"], cat: "sauce", emoji: "🍊", macros: { cal: 0, protein: 0, carbs: 0, fat: 0 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Liquid smoke", zh: "液態煙燻調味料", aliases: ["smoke flavor", "smoke flavouring"], cat: "sauce", emoji: "💨", macros: { cal: 0, protein: 0, carbs: 0, fat: 0 }, grams: 5, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Black garlic", zh: "黑蒜", aliases: ["fermented black garlic", "aged garlic"], cat: "veg", emoji: "🧄", macros: { cal: 200, protein: 7, carbs: 45, fat: 0.5 }, grams: 5, serving: "1 clove", servingZh: "1 瓣" }),
  ingredient({ name: "Asafoetida", zh: "阿魏", aliases: ["hing", "asafetida", "devil's dung"], cat: "sauce", emoji: "🟨", macros: { cal: 297, protein: 4, carbs: 67, fat: 1 }, grams: 1, serving: "1/4 tsp", servingZh: "1/4 小匙" }),
  ingredient({ name: "Amchur powder", zh: "芒果乾粉", aliases: ["amchoor", "dried mango powder"], cat: "sauce", emoji: "🥭", macros: { cal: 300, protein: 3, carbs: 75, fat: 1 }, grams: 2, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Sumac", zh: "漆樹香料", aliases: ["sumac spice", "sumach"], cat: "sauce", emoji: "🔴", macros: { cal: 250, protein: 5, carbs: 50, fat: 15 }, grams: 2, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Ajwain", zh: "印度藏茴香", aliases: ["carom seeds", "bishop's weed", "ajowan"], cat: "sauce", emoji: "🌿", macros: { cal: 305, protein: 16, carbs: 43, fat: 25 }, grams: 2, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Nigella seeds", zh: "黑種草籽", aliases: ["kalonji", "black cumin", "black seed"], cat: "sauce", emoji: "⚫", macros: { cal: 375, protein: 18, carbs: 44, fat: 22 }, grams: 2, serving: "1 tsp", servingZh: "1 小匙" }),
  ingredient({ name: "Fenugreek leaves, dried", zh: "乾葫蘆巴葉", aliases: ["kasuri methi", "kasoori methi"], cat: "veg", emoji: "🌿", macros: { cal: 323, protein: 23, carbs: 58, fat: 6 }, grams: 1, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Makrut lime leaves", zh: "馬蜂橙葉", aliases: ["kaffir lime leaves", "Thai lime leaves", "makrud lime leaves"], cat: "veg", emoji: "🌿", macros: { cal: 43, protein: 1.5, carbs: 10, fat: 0.3 }, grams: 1, serving: "2 leaves", servingZh: "2 片葉" }),
  ingredient({ name: "Galangal", zh: "南薑", aliases: ["Thai ginger", "greater galangal", "lengkuas", "laos root"], cat: "veg", emoji: "🫚", macros: { cal: 71, protein: 1, carbs: 15, fat: 0.5 }, grams: 10, serving: "5 slices", servingZh: "5 片" }),
  ingredient({ name: "Pandan leaves", zh: "班蘭葉", aliases: ["screwpine leaves", "daun pandan"], cat: "veg", emoji: "🌿", macros: { cal: 35, protein: 2, carbs: 7, fat: 0.5 }, grams: 10, serving: "2 leaves", servingZh: "2 片葉" }),
  ingredient({ name: "Kombu", zh: "昆布", aliases: ["konbu", "dried kelp", "dashima", "haidai"], cat: "veg", emoji: "🌿", macros: { cal: 225, protein: 8, carbs: 51, fat: 1.5 }, grams: 5, serving: "1 strip", servingZh: "1 片" }),
  ingredient({ name: "Wakame, dried", zh: "乾裙帶菜", aliases: ["sea mustard", "miyeok"], cat: "veg", emoji: "🌿", macros: { cal: 274, protein: 18, carbs: 41, fat: 4 }, grams: 5, serving: "1/4 cup dry", servingZh: "1/4 杯乾燥" }),
  ingredient({ name: "Katsuobushi", zh: "柴魚片", aliases: ["bonito flakes", "dried bonito", "okaka"], cat: "protein", emoji: "🐟", macros: { cal: 383, protein: 76.5, carbs: 2.6, fat: 6.2 }, grams: 3, serving: "1 cup loose", servingZh: "1 杯鬆裝" }),
  ingredient({ name: "Dried shrimp powder", zh: "蝦米粉", aliases: ["ebi powder", "hae bee powder", "udang kering powder"], cat: "protein", emoji: "🦐", macros: { cal: 330, protein: 62, carbs: 3, fat: 7 }, grams: 5, serving: "1 tbsp", servingZh: "1 大匙" }),
  ingredient({ name: "Tempeh starter", zh: "天貝菌種", aliases: ["ragi tempeh", "Rhizopus starter", "tempeh culture"], cat: "other", emoji: "🦠", macros: { cal: 0, protein: 0, carbs: 0, fat: 0 }, grams: 1, serving: "1 g starter", servingZh: "1 克菌種" }),
  ingredient({ name: "Koji starter", zh: "麴菌種", aliases: ["koji-kin", "Aspergillus oryzae starter", "tane koji"], cat: "other", emoji: "🦠", macros: { cal: 0, protein: 0, carbs: 0, fat: 0 }, grams: 1, serving: "1 g starter", servingZh: "1 克菌種" }),
];

const ADDITIVES: AdditiveSpec[] = [
  // Colours
  ["Curcumin", "薑黃素", "100", ["turmeric color", "turmeric colour"]],
  ["Riboflavin", "核黃素", "101", ["vitamin B2 color"]],
  ["Tartrazine", "檸檬黃", "102", ["FD&C Yellow 5", "Yellow 5"]],
  ["Quinoline yellow", "喹啉黃", "104"],
  ["Sunset yellow FCF", "日落黃 FCF", "110", ["Yellow 6", "FD&C Yellow 6"]],
  ["Carmine", "胭脂紅", "120", ["cochineal", "cochineal extract", "carminic acid", "natural red 4", "CI 75470"]],
  ["Azorubine", "偶氮玉紅", "122", ["carmoisine"]],
  ["Ponceau 4R", "胭脂紅 4R", "124", ["cochineal red A"]],
  ["Erythrosine", "赤藻紅", "127", ["Red 3", "FD&C Red 3"]],
  ["Allura red AC", "食用紅色四十號", "129", ["Red 40", "FD&C Red 40"]],
  ["Patent blue V", "專利藍 V", "131"],
  ["Indigotine", "靛藍", "132", ["indigo carmine", "Blue 2", "FD&C Blue 2"]],
  ["Brilliant blue FCF", "亮藍 FCF", "133", ["Blue 1", "FD&C Blue 1"]],
  ["Chlorophyll", "葉綠素", "140", ["chlorophylls"]],
  ["Copper chlorophyllin", "銅葉綠素", "141", ["copper complexes of chlorophylls"]],
  ["Caramel colour I", "焦糖色素 I", "150a", ["plain caramel"]],
  ["Caramel colour II", "焦糖色素 II", "150b", ["caustic sulfite caramel"]],
  ["Caramel colour III", "焦糖色素 III", "150c", ["ammonia caramel"]],
  ["Caramel colour IV", "焦糖色素 IV", "150d", ["sulfite ammonia caramel"]],
  ["Vegetable carbon", "植物炭黑", "153", ["activated charcoal", "carbon black food color"]],
  ["Beta-carotene", "β-胡蘿蔔素", "160a", ["beta carotene", "provitamin A color"]],
  ["Annatto extract", "胭脂樹橙", "160b", ["annatto", "achiote color", "bixin", "norbixin"]],
  ["Paprika extract", "紅椒色素", "160c", ["paprika oleoresin", "capsanthin", "capsorubin"]],
  ["Lycopene", "茄紅素", "160d", ["tomato red"]],
  ["Lutein", "葉黃素", "161b", ["marigold extract"]],
  ["Beet red", "甜菜紅", "162", ["betanin", "beetroot red"]],
  ["Anthocyanins", "花青素", "163", ["anthocyanin colours"]],
  ["Calcium carbonate", "碳酸鈣", "170", ["chalk food color"]],
  ["Iron oxides", "氧化鐵", "172", ["iron oxide colors", "iron hydroxides"]],
  ["Titanium dioxide", "二氧化鈦", "171", ["titanium white"]],

  // Preservatives and antioxidants
  ["Sorbic acid", "己二烯酸", "200"],
  ["Sodium sorbate", "己二烯酸鈉", "201"],
  ["Potassium sorbate", "己二烯酸鉀", "202"],
  ["Calcium sorbate", "己二烯酸鈣", "203"],
  ["Benzoic acid", "苯甲酸", "210"],
  ["Sodium benzoate", "苯甲酸鈉", "211"],
  ["Potassium benzoate", "苯甲酸鉀", "212"],
  ["Calcium benzoate", "苯甲酸鈣", "213"],
  ["Sulfur dioxide", "二氧化硫", "220", ["sulphur dioxide"]],
  ["Sodium sulfite", "亞硫酸鈉", "221", ["sodium sulphite"]],
  ["Sodium bisulfite", "亞硫酸氫鈉", "222", ["sodium bisulphite"]],
  ["Sodium metabisulfite", "焦亞硫酸鈉", "223", ["sodium metabisulphite"]],
  ["Potassium metabisulfite", "焦亞硫酸鉀", "224", ["potassium metabisulphite"]],
  ["Calcium sulfite", "亞硫酸鈣", "226", ["calcium sulphite"]],
  ["Potassium bisulfite", "亞硫酸氫鉀", "228", ["potassium bisulphite"]],
  ["Nisin", "乳酸鏈球菌素", "234"],
  ["Natamycin", "納他黴素", "235", ["pimaricin"]],
  ["Potassium nitrite", "亞硝酸鉀", "249"],
  ["Sodium nitrite", "亞硝酸鈉", "250"],
  ["Sodium nitrate", "硝酸鈉", "251"],
  ["Potassium nitrate", "硝酸鉀", "252", ["saltpetre", "saltpeter"]],
  ["Propionic acid", "丙酸", "280"],
  ["Sodium propionate", "丙酸鈉", "281"],
  ["Calcium propionate", "丙酸鈣", "282"],
  ["Potassium propionate", "丙酸鉀", "283"],
  ["Ascorbic acid", "抗壞血酸", "300", ["vitamin C"]],
  ["Sodium ascorbate", "抗壞血酸鈉", "301"],
  ["Calcium ascorbate", "抗壞血酸鈣", "302"],
  ["Mixed tocopherols", "混合生育醇", "306", ["vitamin E antioxidant"]],
  ["Alpha-tocopherol", "α-生育醇", "307", ["vitamin E"]],
  ["Propyl gallate", "沒食子酸丙酯", "310"],
  ["TBHQ", "第三丁基氫醌", "319", ["tert-butylhydroquinone"]],
  ["BHA", "丁基羥基甲氧苯", "320", ["butylated hydroxyanisole"]],
  ["BHT", "二丁基羥基甲苯", "321", ["butylated hydroxytoluene"]],
  ["Sodium erythorbate", "異抗壞血酸鈉", "316", ["sodium isoascorbate"]],

  // Acidity regulators, leavening and mineral salts
  ["Acetic acid", "醋酸", "260", ["ethanoic acid"]],
  ["Lactic acid", "乳酸", "270"],
  ["Citric acid", "檸檬酸", "330"],
  ["Sodium citrate", "檸檬酸鈉", "331", ["trisodium citrate"]],
  ["Potassium citrate", "檸檬酸鉀", "332", ["tripotassium citrate"]],
  ["Calcium citrate", "檸檬酸鈣", "333"],
  ["Tartaric acid", "酒石酸", "334"],
  ["Cream of tartar", "塔塔粉", "336", ["potassium bitartrate", "potassium hydrogen tartrate"]],
  ["Phosphoric acid", "磷酸", "338", ["orthophosphoric acid"]],
  ["Sodium phosphates", "磷酸鈉", "339", ["monosodium phosphate", "disodium phosphate", "trisodium phosphate"]],
  ["Potassium phosphates", "磷酸鉀", "340"],
  ["Calcium phosphates", "磷酸鈣", "341", ["tricalcium phosphate"]],
  ["Malic acid", "蘋果酸", "296"],
  ["Fumaric acid", "富馬酸", "297"],
  ["Sodium bicarbonate", "碳酸氫鈉", "500(ii)", ["baking soda", "bicarbonate of soda"]],
  ["Sodium carbonate", "碳酸鈉", "500(i)", ["soda ash", "washing soda food grade"]],
  ["Potassium bicarbonate", "碳酸氫鉀", "501(ii)"],
  ["Ammonium bicarbonate", "碳酸氫銨", "503(ii)", ["baker's ammonia", "hartshorn"]],
  ["Magnesium carbonate", "碳酸鎂", "504"],
  ["Hydrochloric acid", "鹽酸", "507"],
  ["Potassium chloride", "氯化鉀", "508", ["potassium salt"]],
  ["Calcium chloride", "氯化鈣", "509"],
  ["Magnesium chloride", "氯化鎂", "511", ["nigari"]],
  ["Calcium sulfate", "硫酸鈣", "516", ["calcium sulphate", "gypsum food grade"]],
  ["Glucono delta-lactone", "葡萄糖酸-δ-內酯", "575", ["GDL", "gluconolactone"]],
  ["EDTA", "乙二胺四乙酸", "385", ["calcium disodium EDTA", "disodium EDTA"]],

  // Gums, thickeners and stabilizers
  ["Alginic acid", "海藻酸", "400", ["alginate acid"]],
  ["Sodium alginate", "海藻酸鈉", "401"],
  ["Potassium alginate", "海藻酸鉀", "402"],
  ["Calcium alginate", "海藻酸鈣", "404"],
  ["Agar", "洋菜", "406", ["agar agar", "kanten", "china grass"]],
  ["Carrageenan", "鹿角菜膠", "407", ["irish moss extract"]],
  ["Locust bean gum", "刺槐豆膠", "410", ["carob bean gum"]],
  ["Guar gum", "關華豆膠", "412", ["guaran"]],
  ["Tragacanth gum", "黃蓍膠", "413", ["tragacanth"]],
  ["Gum arabic", "阿拉伯膠", "414", ["acacia gum", "acacia fiber"]],
  ["Xanthan gum", "三仙膠", "415", ["xanthan"]],
  ["Karaya gum", "刺梧桐膠", "416", ["sterculia gum"]],
  ["Tara gum", "塔拉膠", "417"],
  ["Gellan gum", "結蘭膠", "418"],
  ["Konjac gum", "蒟蒻膠", "425", ["konjac glucomannan", "glucomannan"]],
  ["Pectin", "果膠", "440"],
  ["Microcrystalline cellulose", "微結晶纖維素", "460(i)", ["MCC"]],
  ["Methylcellulose", "甲基纖維素", "461"],
  ["Hydroxypropyl methylcellulose", "羥丙基甲基纖維素", "464", ["HPMC", "hypromellose"]],
  ["Cellulose gum", "羧甲基纖維素鈉", "466", ["CMC", "sodium carboxymethyl cellulose", "carboxymethylcellulose"]],

  // Emulsifiers and processing aids
  ["Lecithin", "卵磷脂", "322", ["soy lecithin", "sunflower lecithin", "egg lecithin"]],
  ["Mono- and diglycerides", "脂肪酸單甘油酯及雙甘油酯", "471", ["mono diglycerides", "monoglycerides", "diglycerides"]],
  ["DATEM", "二乙醯酒石酸單雙甘油酯", "472e", ["diacetyl tartaric acid esters of mono and diglycerides"]],
  ["Polysorbate 20", "聚山梨醇酯 20", "432", ["Tween 20"]],
  ["Polysorbate 60", "聚山梨醇酯 60", "435", ["Tween 60"]],
  ["Polysorbate 80", "聚山梨醇酯 80", "433", ["Tween 80"]],
  ["Sorbitan monostearate", "山梨醇酐單硬脂酸酯", "491", ["Span 60"]],
  ["Sodium stearoyl lactylate", "硬脂醯乳酸鈉", "481", ["SSL"]],
  ["Calcium stearoyl lactylate", "硬脂醯乳酸鈣", "482", ["CSL"]],
  ["PGPR", "聚甘油聚蓖麻醇酸酯", "476", ["polyglycerol polyricinoleate"]],
  ["Silicon dioxide", "二氧化矽", "551", ["silica", "anti-caking silica"]],
  ["Calcium silicate", "矽酸鈣", "552"],
  ["Magnesium silicate", "矽酸鎂", "553a", ["talc food grade"]],

  // Sweeteners and polyols
  ["Sorbitol", "山梨糖醇", "420", ["glucitol"]],
  ["Mannitol", "甘露糖醇", "421"],
  ["Acesulfame potassium", "醋磺內酯鉀", "950", ["acesulfame K", "Ace-K"]],
  ["Aspartame", "阿斯巴甜", "951"],
  ["Cyclamate", "環己基磺醯胺酸鹽", "952", ["sodium cyclamate"]],
  ["Isomalt", "異麥芽酮糖醇", "953"],
  ["Saccharin", "糖精", "954", ["sodium saccharin"]],
  ["Sucralose", "蔗糖素", "955", ["Splenda sweetener"]],
  ["Thaumatin", "索馬甜", "957"],
  ["Steviol glycosides", "甜菊醣苷", "960", ["stevia extract", "reb A", "rebaudioside A", "stevioside"]],
  ["Neotame", "紐甜", "961"],
  ["Maltitol", "麥芽糖醇", "965"],
  ["Lactitol", "乳糖醇", "966"],
  ["Xylitol", "木糖醇", "967", ["birch sugar"]],
  ["Erythritol", "赤藻糖醇", "968"],
  ["Advantame", "愛德萬甜", "969"],
  ["Monk fruit extract", "羅漢果萃取物", "", ["luo han guo", "mogroside V", "monkfruit sweetener"]],

  // Flavour enhancers, enzymes and specialty ingredients
  ["Monosodium glutamate", "味精", "621", ["MSG", "sodium glutamate", "ajinomoto"]],
  ["Monopotassium glutamate", "麩胺酸鉀", "622"],
  ["Calcium diglutamate", "麩胺酸鈣", "623"],
  ["Disodium guanylate", "鳥嘌呤核苷磷酸二鈉", "627", ["GMP", "sodium guanylate"]],
  ["Disodium inosinate", "肌苷酸二鈉", "631", ["IMP", "sodium inosinate"]],
  ["Disodium ribonucleotides", "核糖核苷酸二鈉", "635", ["I+G", "disodium 5-ribonucleotides"]],
  ["Glycine", "甘胺酸", "640", ["aminoacetic acid"]],
  ["Invertase", "轉化酶", "1103", ["sucrase", "beta-fructofuranosidase"]],
  ["Lysozyme", "溶菌酶", "1105"],
  ["Transglutaminase", "轉麩醯胺酶", "", ["meat glue", "TG enzyme"]],
  ["Rennet", "凝乳酶", "", ["chymosin", "rennin", "microbial rennet", "vegetable rennet"]],
  ["Lactase", "乳糖酶", "", ["beta-galactosidase"]],
  ["Amylase", "澱粉酶", "", ["alpha amylase"]],
  ["Protease", "蛋白酶", "", ["proteinase", "peptidase"]],
  ["Lipase", "脂肪酶", ""],
  ["Glucose oxidase", "葡萄糖氧化酶", ""],
  ["Vanillin", "香草醛", "", ["synthetic vanilla", "vanilla flavor compound"]],
  ["Ethyl vanillin", "乙基香草醛", "", ["ethylvanillin"]],
];

export const LONG_TAIL_FOODS: FoodItem[] = [
  ...CULINARY_INGREDIENTS,
  ...ADDITIVES.map(additive),
];

/** Regional spellings attached to higher-quality records already in the main catalog. */
export const FOOD_ALIAS_OVERLAYS: Record<string, string[]> = {
  rambutan: ["hairy lychee", "Nephelium lappaceum", "ramboutan", "红毛丹"],
  "tfda-D0600101": ["hairy lychee", "Nephelium lappaceum", "ramboutan", "红毛丹"],
  "tfda-P1004701": ["belacan", "blacan", "blachan", "terasi", "trassi", "kapi", "ngapi", "mam tom", "mắm tôm", "petis udang", "hae ko", "shrimp condiment"],
  "tfda-R4700601": ["douchi", "tochi", "touchi", "Chinese fermented black beans", "salted black beans"],
  "tfda-J0800401": ["katsuobushi", "okaka", "bonito flakes", "dried bonito shavings"],
};
