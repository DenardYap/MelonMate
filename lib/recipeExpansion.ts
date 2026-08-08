import type { Ingredient, Recipe } from "./types";

type Blueprint = readonly [
  slug: string,
  en: string,
  zh: string,
  emoji: string,
  cat: Recipe["cat"],
  mainEn: string,
  mainZh: string,
  baseEn: string,
  baseZh: string,
  produceEn: string,
  produceZh: string,
  flavorEn: string,
  flavorZh: string,
];

type CuisineCollection = {
  tag: string;
  recipes: Blueprint[];
};

// Every cuisine receives the same broad mix of dietary options. Individual
// ingredients in each position are chosen to satisfy the corresponding tags.
const DIET_ROTATION = [
  ["vegan", "vegetarian", "dairyFree", "balanced"],
  ["vegetarian", "highProtein", "balanced"],
  ["pescatarian", "highProtein", "glutenFree", "dairyFree"],
  ["keto", "lowCarb", "highProtein", "glutenFree", "dairyFree"],
  ["halal", "highProtein", "dairyFree", "massGain"],
  ["kosher", "pescatarian", "dairyFree", "balanced"],
  ["vegan", "vegetarian", "glutenFree", "dairyFree", "fatLoss"],
  ["lowFODMAP", "highProtein", "dairyFree", "balanced"],
  ["paleo", "highProtein", "glutenFree", "dairyFree"],
  ["vegan", "vegetarian", "highProtein", "dairyFree", "massGain"],
] as const;

const COLLECTIONS: CuisineCollection[] = [
  {
    tag: "chinese",
    recipes: [
      ["tea-smoked-tofu-millet", "Tea-smoked tofu & millet jars", "茶燻豆腐小米罐", "🫖", "asian", "Tea-smoked tofu", "茶燻豆腐", "Millet", "小米", "Wood ear & cucumber", "木耳與小黃瓜", "Cilantro-sesame dressing", "香菜芝麻醬"],
      ["tomato-egg-buckwheat", "Silky tomato egg buckwheat boxes", "滑蛋番茄蕎麥餐盒", "🍅", "asian", "Soft scrambled eggs", "嫩炒蛋", "Buckwheat groats", "蕎麥粒", "Baby bok choy", "小青江菜", "White pepper tomato sauce", "白胡椒番茄醬"],
      ["black-vinegar-trout", "Black-vinegar trout with lotus root", "黑醋鱒魚蓮藕飯", "🐟", "asian", "Trout fillets", "鱒魚片", "Brown rice", "糙米", "Lotus root & snow peas", "蓮藕與甜豆", "Black vinegar ginger glaze", "黑醋薑汁"],
      ["cumin-beef-cauliflower", "Xinjiang cumin beef cauliflower bowls", "新疆孜然牛肉花椰菜米", "🥩", "asian", "Lean beef strips", "瘦牛肉片", "Cauliflower rice", "花椰菜米", "Celery & red pepper", "芹菜與紅椒", "Cumin-chili oil", "孜然辣椒油"],
      ["five-spice-chicken-sorghum", "Five-spice chicken & sorghum lunch boxes", "五香雞肉高粱餐盒", "🍗", "asian", "Halal chicken thighs", "清真雞腿", "Sorghum", "高粱米", "Mustard greens", "芥菜", "Five-spice ginger jus", "五香薑汁"],
      ["steamed-cod-pumpkin", "Steamed cod with fermented black bean pumpkin", "豉汁南瓜蒸鱈魚", "🎃", "asian", "Kosher cod", "猶太潔食鱈魚", "Jasmine rice", "茉莉香米", "Kabocha & gai lan", "南瓜與芥蘭", "Fermented black bean sauce", "豆豉醬"],
      ["yunnan-mushroom-rice", "Yunnan mushroom & herb rice pots", "雲南菌菇香草飯", "🍄", "veg", "King oyster mushrooms", "杏鮑菇", "Red rice", "紅米", "Napa cabbage", "大白菜", "Mint-chili dressing", "薄荷辣椒醬"],
      ["ginger-chive-pork", "Ginger-chive pork with rice noodles", "薑韭豬肉米粉盒", "🌿", "asian", "Lean pork loin", "瘦豬里肌", "Rice noodles", "米粉", "Carrot & spinach", "胡蘿蔔與菠菜", "Ginger and chive tops", "薑與韭菜綠葉"],
      ["plum-duck-cabbage", "Plum duck with charred cabbage", "梅香鴨胸炙高麗菜", "🦆", "asian", "Duck breast", "鴨胸", "Roasted sweet potato", "烤地瓜", "Charred cabbage", "炙高麗菜", "Fresh plum reduction", "鮮梅濃汁"],
      ["mapo-lentil-tofu", "Mapo lentil tofu rice bowls", "麻婆扁豆豆腐飯", "🌶️", "veg", "Firm tofu & lentils", "板豆腐與扁豆", "Brown rice", "糙米", "Eggplant", "茄子", "Doubanjiang pepper sauce", "豆瓣花椒醬"],
    ],
  },
  {
    tag: "taiwanese",
    recipes: [
      ["three-cup-tempeh", "Three-cup tempeh basil boxes", "三杯天貝九層塔餐盒", "🌿", "asian", "Tempeh", "天貝", "Purple rice", "紫米", "King oyster mushrooms", "杏鮑菇", "Basil-sesame glaze", "九層塔麻油醬"],
      ["tea-egg-pumpkin", "Tea egg, pumpkin & edamame rice", "茶葉蛋南瓜毛豆飯", "🥚", "asian", "Tea eggs & edamame", "茶葉蛋與毛豆", "Brown rice", "糙米", "Roasted pumpkin", "烤南瓜", "Star-anise tea dressing", "八角茶香醬"],
      ["milkfish-radish", "Milkfish with daikon ginger rice", "薑燒虱目魚蘿蔔飯", "🐟", "asian", "Milkfish fillets", "虱目魚片", "Jasmine rice", "茉莉香米", "Daikon & spinach", "白蘿蔔與菠菜", "Ginger rice-wine glaze", "薑香米酒汁"],
      ["pepper-beef-bamboo", "Black-pepper beef & bamboo shoots", "黑胡椒牛肉筍絲盒", "🥩", "asian", "Lean beef", "瘦牛肉", "Cauliflower rice", "花椰菜米", "Bamboo shoots & peppers", "筍絲與甜椒", "Taiwanese black pepper sauce", "台式黑胡椒醬"],
      ["shacha-chicken-taro", "Shacha chicken with roasted taro", "沙茶雞肉烤芋頭", "🍠", "asian", "Halal chicken breast", "清真雞胸", "Roasted taro", "烤芋頭", "Water spinach", "空心菜", "Shacha-style sesame sauce", "沙茶風芝麻醬"],
      ["miso-salmon-cabbage", "Miso salmon & sesame cabbage boxes", "味噌鮭魚芝麻高麗菜", "🐟", "asian", "Kosher salmon", "猶太潔食鮭魚", "Short-grain rice", "短米", "Cabbage & carrots", "高麗菜與胡蘿蔔", "Sweet miso glaze", "甜味噌醬"],
      ["luwei-tofu-quinoa", "Lu-wei tofu & kelp quinoa bowls", "滷味豆腐海帶藜麥碗", "🧊", "veg", "Five-spice tofu", "五香豆干", "Quinoa", "藜麥", "Kelp & radish", "海帶與蘿蔔", "Tamari spice broth", "無麩質香料滷汁"],
      ["scallion-turkey-rice", "Scallion-top turkey rice boxes", "青蔥火雞肉燥飯", "🍚", "asian", "Lean turkey mince", "瘦火雞絞肉", "White rice", "白飯", "Bok choy", "青江菜", "Ginger-scallion green oil", "薑與蔥綠油"],
      ["guava-pork-slaw", "Guava-glazed pork & cabbage slaw", "芭樂醬豬肉高麗菜沙拉", "🍈", "western", "Pork tenderloin", "豬里肌", "Roasted plantain", "烤大蕉", "Cabbage & guava", "高麗菜與芭樂", "Lime guava glaze", "萊姆芭樂醬"],
      ["fermented-mustard-beans", "Fermented mustard greens & black bean rice", "酸菜黑豆糙米餐盒", "🫘", "veg", "Black beans", "黑豆", "Brown rice", "糙米", "Fermented mustard greens", "酸菜", "Chili ginger oil", "辣椒薑油"],
    ],
  },
  {
    tag: "vietnamese",
    recipes: [
      ["turmeric-tofu-dill", "Turmeric tofu with dill rice noodles", "薑黃蒔蘿豆腐米線", "🌿", "asian", "Turmeric tofu", "薑黃豆腐", "Rice vermicelli", "米線", "Dill & cucumber", "蒔蘿與小黃瓜", "Lime herb dressing", "萊姆香草醬"],
      ["egg-coffee-oats", "Vietnamese coffee egg overnight oats", "越式咖啡蛋香隔夜燕麥", "☕", "breakfast", "Pasteurized egg & yogurt", "殺菌蛋液與優格", "Rolled oats", "燕麥片", "Banana", "香蕉", "Coffee-cinnamon cream", "咖啡肉桂醬"],
      ["tamarind-salmon-rice", "Tamarind salmon broken-rice boxes", "羅望子鮭魚碎米飯", "🐟", "asian", "Salmon fillets", "鮭魚片", "Broken rice", "碎米", "Pickled carrot & daikon", "醃胡蘿蔔白蘿蔔", "Tamarind fish-sauce glaze", "羅望子魚露醬"],
      ["lemongrass-beef-cabbage", "Lemongrass beef cabbage bowls", "香茅牛肉高麗菜碗", "🥩", "asian", "Lean beef", "瘦牛肉", "Cauliflower rice", "花椰菜米", "Cabbage & herbs", "高麗菜與香草", "Lemongrass chili oil", "香茅辣椒油"],
      ["turkey-bun-cha", "Turkey bún chả meal-prep boxes", "火雞肉越式烤肉米線盒", "🍜", "asian", "Halal turkey patties", "清真火雞肉餅", "Rice noodles", "米線", "Lettuce & pickled carrot", "生菜與醃胡蘿蔔", "Nước chấm", "越式魚露酸甜醬"],
      ["ginger-cod-congee", "Ginger cod cháo with herbs", "薑香鱈魚越式粥", "🥣", "asian", "Kosher cod", "猶太潔食鱈魚", "Jasmine rice congee", "茉莉香米粥", "Bean sprouts & herbs", "豆芽與香草", "Ginger pepper oil", "薑胡椒油"],
      ["jackfruit-banh-mi-bowl", "Five-spice jackfruit bánh mì bowls", "五香波羅蜜越式法包碗", "🥖", "veg", "Young jackfruit", "嫩波羅蜜", "Quinoa", "藜麥", "Pickled daikon & cucumber", "醃白蘿蔔與小黃瓜", "Tamari five-spice glaze", "無麩質五香醬"],
      ["lime-chicken-pumpkin", "Lime-leaf chicken pumpkin rice", "萊姆葉雞肉南瓜飯", "🍋", "asian", "Chicken breast", "雞胸", "White rice", "白飯", "Pumpkin & green beans", "南瓜與四季豆", "Ginger lime-leaf oil", "薑香萊姆葉油"],
      ["pork-pomelo-slaw", "Caramel pork & pomelo slaw", "焦糖豬肉柚子沙拉", "🍊", "asian", "Pork tenderloin", "豬里肌", "Roasted sweet potato", "烤地瓜", "Pomelo & cabbage", "柚子與高麗菜", "Coconut-aminos caramel", "椰子胺基焦糖醬"],
      ["mung-bean-mushroom-xoi", "Mung bean mushroom sticky-rice pots", "綠豆菇菇糯米飯", "🍄", "veg", "Mung beans & mushrooms", "綠豆與菇類", "Sticky rice", "糯米", "Baby spinach", "嫩菠菜", "Crispy shallot-chili oil", "酥紅蔥辣椒油"],
    ],
  },
  {
    tag: "korean",
    recipes: [
      ["gochujang-lentil-tofu", "Gochujang lentil tofu bibimbap", "辣醬扁豆豆腐拌飯", "🌶️", "asian", "Tofu & lentils", "豆腐與扁豆", "Brown rice", "糙米", "Spinach & bean sprouts", "菠菜與豆芽", "Gochujang pear sauce", "辣醬梨汁"],
      ["gyeran-jjim-barley", "Gyeran-jjim barley vegetable boxes", "韓式蒸蛋薏仁蔬菜盒", "🥚", "asian", "Steamed eggs", "韓式蒸蛋", "Pearled barley", "薏仁", "Zucchini & mushrooms", "櫛瓜與菇類", "Sesame scallion sauce", "芝麻蔥醬"],
      ["doenjang-cod-rice", "Doenjang cod & perilla rice", "大醬鱈魚紫蘇飯", "🐟", "asian", "Cod fillets", "鱈魚片", "Purple rice", "紫米", "Perilla & radish", "紫蘇與蘿蔔", "Doenjang ginger glaze", "大醬薑汁"],
      ["bulgogi-beef-lettuce", "Bulgogi beef lettuce meal boxes", "韓式烤牛肉生菜餐盒", "🥬", "asian", "Lean beef", "瘦牛肉", "Cauliflower rice", "花椰菜米", "Lettuce & cucumber", "生菜與小黃瓜", "Sugar-free bulgogi sauce", "無糖烤肉醬"],
      ["dakgalbi-sorghum", "Dak-galbi chicken & sorghum bowls", "辣炒雞高粱碗", "🍗", "asian", "Halal chicken thighs", "清真雞腿", "Sorghum", "高粱米", "Cabbage & sweet potato", "高麗菜與地瓜", "Gochugaru chili paste", "韓式辣椒醬"],
      ["sesame-salmon-kimbap", "Deconstructed salmon kimbap boxes", "鮭魚紫菜飯餐盒", "🍙", "asian", "Kosher salmon", "猶太潔食鮭魚", "Short-grain rice", "短米", "Spinach, carrot & nori", "菠菜胡蘿蔔與海苔", "Sesame rice seasoning", "芝麻飯香鬆"],
      ["kimchi-chickpea-millet", "Kimchi chickpea millet bowls", "泡菜鷹嘴豆小米碗", "🫘", "veg", "Chickpeas", "鷹嘴豆", "Millet", "小米", "Vegan kimchi & cucumber", "純素泡菜與小黃瓜", "Tamari sesame dressing", "無麩質芝麻醬"],
      ["ginger-turkey-japchae", "Ginger turkey sweet-potato noodles", "薑香火雞地瓜粉絲", "🍜", "asian", "Lean turkey", "瘦火雞肉", "Sweet-potato noodles", "地瓜粉絲", "Carrot & bok choy", "胡蘿蔔與青江菜", "Ginger sesame oil", "薑香麻油"],
      ["pear-pork-radish", "Pear-glazed pork with radish ribbons", "梨汁豬肉蘿蔔絲", "🍐", "asian", "Pork tenderloin", "豬里肌", "Roasted squash", "烤南瓜", "Radish & perilla", "蘿蔔與紫蘇", "Pear coconut-aminos glaze", "梨汁椰子胺基醬"],
      ["black-bean-tempeh", "Black-bean tempeh brown-rice pots", "黑豆天貝糙米鍋", "🫘", "veg", "Tempeh & black beans", "天貝與黑豆", "Brown rice", "糙米", "Mushrooms & cabbage", "菇類與高麗菜", "Gochugaru garlic sauce", "辣椒蒜醬"],
    ],
  },
  {
    tag: "japanese",
    recipes: [
      ["yuzu-tofu-quinoa", "Yuzu tofu & hijiki quinoa boxes", "柚子豆腐羊栖菜藜麥盒", "🍋", "asian", "Firm tofu", "板豆腐", "Quinoa", "藜麥", "Hijiki & edamame", "羊栖菜與毛豆", "Yuzu sesame dressing", "柚子芝麻醬"],
      ["tamagoyaki-soba-salad", "Tamagoyaki soba salad boxes", "玉子燒蕎麥沙拉盒", "🍳", "asian", "Tamagoyaki", "玉子燒", "Buckwheat soba", "蕎麥麵", "Cucumber & radish", "小黃瓜與蘿蔔", "Miso ginger dressing", "味噌薑汁"],
      ["shio-koji-trout", "Shio-koji trout & chestnut rice", "鹽麴鱒魚栗子飯", "🐟", "asian", "Trout fillets", "鱒魚片", "Chestnut rice", "栗子飯", "Broccolini", "嫩莖花椰菜", "Shio-koji glaze", "鹽麴醬"],
      ["shiso-beef-daikon", "Shiso beef & daikon cauliflower rice", "紫蘇牛肉蘿蔔花椰菜飯", "🥩", "asian", "Lean beef", "瘦牛肉", "Cauliflower rice", "花椰菜米", "Daikon & shiso", "白蘿蔔與紫蘇", "Sansho citrus oil", "山椒柑橘油"],
      ["yakitori-chicken-barley", "Yakitori chicken barley lunch boxes", "日式烤雞薏仁餐盒", "🍢", "asian", "Halal chicken", "清真雞肉", "Pearled barley", "薏仁", "Shishito peppers", "獅子椒", "Tamari yakitori glaze", "無麩質照燒醬"],
      ["sake-salmon-onigiri", "Sake salmon onigiri bowls", "酒香鮭魚飯糰碗", "🍙", "asian", "Kosher salmon", "猶太潔食鮭魚", "Short-grain rice", "短米", "Nori & cucumber", "海苔與小黃瓜", "Rice-vinegar furikake", "米醋香鬆"],
      ["kinpira-chickpea-rice", "Kinpira chickpea rice bowls", "金平牛蒡鷹嘴豆飯", "🥕", "veg", "Chickpeas", "鷹嘴豆", "Brown rice", "糙米", "Burdock & carrot", "牛蒡與胡蘿蔔", "Tamari chili glaze", "無麩質辣味醬"],
      ["ginger-chicken-ochazuke", "Ginger chicken ochazuke jars", "薑香雞肉茶泡飯罐", "🍵", "asian", "Chicken breast", "雞胸", "White rice", "白飯", "Spinach & carrot", "菠菜與胡蘿蔔", "Ginger green-tea broth", "薑香綠茶高湯"],
      ["miso-pork-kabocha", "Miso-free pork & kabocha roast", "椰香豬肉烤南瓜", "🎃", "asian", "Pork tenderloin", "豬里肌", "Roasted kabocha", "烤南瓜", "Cabbage slaw", "高麗菜沙拉", "Coconut-aminos ginger glaze", "椰子胺基薑汁"],
      ["azuki-tempeh-donburi", "Azuki tempeh donburi boxes", "紅豆天貝丼飯盒", "🫘", "veg", "Tempeh & azuki beans", "天貝與紅豆", "Brown rice", "糙米", "Mustard greens", "芥菜", "Sesame ginger sauce", "芝麻薑醬"],
    ],
  },
  {
    tag: "thai",
    recipes: [
      ["basil-tofu-black-rice", "Holy-basil tofu black-rice boxes", "打拋豆腐黑米餐盒", "🌿", "asian", "Crumbled tofu", "豆腐碎", "Black rice", "黑米", "Green beans & peppers", "四季豆與甜椒", "Thai basil chili sauce", "九層塔辣椒醬"],
      ["kai-jiao-quinoa", "Thai omelet quinoa herb bowls", "泰式煎蛋藜麥香草碗", "🍳", "asian", "Thai herb omelet", "泰式香草煎蛋", "Quinoa", "藜麥", "Cucumber & herbs", "小黃瓜與香草", "Lime chili dressing", "萊姆辣椒醬"],
      ["tamarind-trout-pumpkin", "Tamarind trout & pumpkin rice", "羅望子鱒魚南瓜飯", "🐟", "asian", "Trout fillets", "鱒魚片", "Jasmine rice", "茉莉香米", "Pumpkin & bok choy", "南瓜與青江菜", "Tamarind lime glaze", "羅望子萊姆醬"],
      ["larb-beef-cabbage", "Larb beef cabbage cups", "泰式辣拌牛肉高麗菜杯", "🥬", "asian", "Lean beef mince", "瘦牛絞肉", "Cauliflower rice", "花椰菜米", "Cabbage & mint", "高麗菜與薄荷", "Toasted-rice lime dressing", "炒米粉萊姆醬"],
      ["massaman-chicken-millet", "Massaman chicken millet bowls", "瑪莎曼雞肉小米碗", "🍛", "asian", "Halal chicken", "清真雞肉", "Millet", "小米", "Carrot & potato", "胡蘿蔔與馬鈴薯", "Peanut-free massaman sauce", "無花生瑪莎曼醬"],
      ["lemongrass-cod-rice", "Lemongrass cod coconut-rice boxes", "香茅鱈魚椰香飯", "🐟", "asian", "Kosher cod", "猶太潔食鱈魚", "Coconut jasmine rice", "椰香茉莉米", "Snow peas", "甜豆", "Lemongrass kaffir-lime glaze", "香茅檸檬葉醬"],
      ["red-curry-chickpea", "Red curry chickpea vegetable pots", "紅咖哩鷹嘴豆蔬菜鍋", "🌶️", "veg", "Chickpeas", "鷹嘴豆", "Brown rice", "糙米", "Eggplant & bamboo shoots", "茄子與竹筍", "Vegan red curry", "純素紅咖哩"],
      ["ginger-chicken-rice-noodle", "Ginger chicken rice-noodle salad", "薑香雞肉米線沙拉", "🍜", "asian", "Chicken breast", "雞胸", "Rice noodles", "米線", "Carrot & cucumber", "胡蘿蔔與小黃瓜", "Ginger lime oil", "薑香萊姆油"],
      ["turmeric-pork-papaya", "Turmeric pork & green papaya slaw", "薑黃豬肉青木瓜沙拉", "🥭", "asian", "Pork tenderloin", "豬里肌", "Roasted plantain", "烤大蕉", "Green papaya & herbs", "青木瓜與香草", "Coconut-aminos lime sauce", "椰子胺基萊姆醬"],
      ["peanut-free-tempeh-satay", "Sunflower tempeh satay rice boxes", "葵花籽天貝沙嗲飯", "🌻", "veg", "Tempeh", "天貝", "Brown rice", "糙米", "Cucumber & cabbage", "小黃瓜與高麗菜", "Sunflower-seed satay sauce", "葵花籽沙嗲醬"],
    ],
  },
  {
    tag: "indian",
    recipes: [
      ["tandoori-tofu-amaranth", "Tandoori tofu amaranth bowls", "坦都里豆腐莧籽碗", "🌶️", "asian", "Tandoori tofu", "坦都里豆腐", "Amaranth", "莧籽", "Roasted cauliflower", "烤花椰菜", "Mint-lime chutney", "薄荷萊姆醬"],
      ["egg-bhurji-millet", "Egg bhurji millet breakfast boxes", "印度香料炒蛋小米早餐盒", "🍳", "breakfast", "Spiced scrambled eggs", "香料炒蛋", "Millet", "小米", "Spinach & tomato", "菠菜與番茄", "Coriander mint chutney", "香菜薄荷醬"],
      ["kokum-salmon-rice", "Kokum salmon red-rice boxes", "洛神果鮭魚紅米餐盒", "🐟", "asian", "Salmon fillets", "鮭魚片", "Red rice", "紅米", "Okra", "秋葵", "Kokum coconut sauce", "洛神果椰香醬"],
      ["keema-beef-cabbage", "Keto beef keema cabbage bowls", "生酮牛肉香料高麗菜碗", "🥩", "asian", "Lean beef mince", "瘦牛絞肉", "Cauliflower rice", "花椰菜米", "Cabbage & spinach", "高麗菜與菠菜", "Garam masala tomato oil", "綜合香料番茄油"],
      ["hariyali-chicken-quinoa", "Hariyali chicken quinoa boxes", "綠香草雞肉藜麥餐盒", "🌿", "asian", "Halal chicken", "清真雞肉", "Quinoa", "藜麥", "Green beans", "四季豆", "Cilantro-mint marinade", "香菜薄荷醃醬"],
      ["mustard-cod-potato", "Bengali mustard cod & potato", "孟加拉芥末鱈魚馬鈴薯", "🐟", "asian", "Kosher cod", "猶太潔食鱈魚", "Turmeric potatoes", "薑黃馬鈴薯", "Spinach", "菠菜", "Mustard seed sauce", "芥末籽醬"],
      ["rajma-quinoa", "Rajma quinoa meal-prep bowls", "印度紅腰豆藜麥餐盒", "🫘", "veg", "Kidney beans", "紅腰豆", "Quinoa", "藜麥", "Tomato & spinach", "番茄與菠菜", "Ginger cumin masala", "薑香孜然醬"],
      ["curry-leaf-turkey-rice", "Curry-leaf turkey rice boxes", "咖哩葉火雞飯盒", "🍃", "asian", "Lean turkey", "瘦火雞", "Basmati rice", "印度香米", "Carrot & zucchini", "胡蘿蔔與櫛瓜", "Ginger curry-leaf oil", "薑香咖哩葉油"],
      ["vindaloo-pork-squash", "Coconut vindaloo pork & squash", "椰香文達盧豬肉南瓜", "🎃", "asian", "Pork tenderloin", "豬里肌", "Roasted squash", "烤南瓜", "Cabbage", "高麗菜", "Coconut-vinegar vindaloo", "椰子醋文達盧醬"],
      ["chana-dal-hemp-rice", "Chana dal hemp-seed rice pots", "鷹嘴豆仁火麻仁飯", "🫕", "veg", "Chana dal & hemp hearts", "鷹嘴豆仁與火麻仁", "Brown rice", "糙米", "Kale & tomato", "羽衣甘藍與番茄", "Tamarind cumin tempering", "羅望子孜然油"],
    ],
  },
  {
    tag: "middleEastern",
    recipes: [
      ["sumac-lentil-freekeh", "Sumac lentil freekeh herb boxes", "漆樹香料扁豆青麥香草盒", "🌿", "western", "Brown lentils", "棕扁豆", "Freekeh", "青麥", "Tomato & parsley", "番茄與巴西里", "Sumac pomegranate dressing", "漆樹石榴醬"],
      ["zaatar-egg-quinoa", "Za’atar egg quinoa breakfast bowls", "扎塔香料蛋藜麥早餐碗", "🥚", "breakfast", "Jammy eggs", "溏心蛋", "Quinoa", "藜麥", "Cucumber & tomato", "小黃瓜與番茄", "Za’atar lemon yogurt", "扎塔檸檬優格"],
      ["chermoula-trout-rice", "Chermoula trout saffron-rice boxes", "香草醬鱒魚番紅花飯", "🐟", "western", "Trout fillets", "鱒魚片", "Saffron rice", "番紅花飯", "Roasted carrots", "烤胡蘿蔔", "Cilantro chermoula", "香菜香草醬"],
      ["shawarma-beef-tabbouleh", "Beef shawarma cauliflower tabbouleh", "沙威瑪牛肉花椰菜塔布勒", "🥩", "western", "Lean beef", "瘦牛肉", "Cauliflower tabbouleh", "花椰菜塔布勒", "Parsley & cucumber", "巴西里與小黃瓜", "Tahini lemon sauce", "芝麻醬檸檬汁"],
      ["baharat-chicken-rice", "Baharat chicken jewelled-rice boxes", "中東綜合香料雞珠寶飯", "✨", "western", "Halal chicken", "清真雞肉", "Basmati rice", "印度香米", "Carrot & raisins", "胡蘿蔔與葡萄乾", "Baharat pan sauce", "中東綜合香料醬"],
      ["dill-salmon-bulgur", "Dill salmon bulgur herb boxes", "蒔蘿鮭魚小麥香草盒", "🐟", "western", "Kosher salmon", "猶太潔食鮭魚", "Bulgur", "布格麥", "Cucumber & dill", "小黃瓜與蒔蘿", "Lemon caper dressing", "檸檬酸豆醬"],
      ["harissa-chickpea-millet", "Harissa chickpea millet bowls", "哈里薩鷹嘴豆小米碗", "🌶️", "veg", "Chickpeas", "鷹嘴豆", "Millet", "小米", "Roasted peppers & zucchini", "烤甜椒與櫛瓜", "Harissa lemon sauce", "哈里薩檸檬醬"],
      ["ginger-lamb-rice", "Ginger lamb rice with cucumber", "薑香羊肉小黃瓜飯", "🍚", "western", "Lean lamb", "瘦羊肉", "White rice", "白飯", "Cucumber & carrots", "小黃瓜與胡蘿蔔", "Ginger mint oil", "薑香薄荷油"],
      ["pomegranate-turkey-squash", "Pomegranate turkey & roasted squash", "石榴火雞烤南瓜", "🎃", "western", "Turkey breast", "火雞胸", "Roasted squash", "烤南瓜", "Arugula & pomegranate", "芝麻葉與石榴", "Pomegranate molasses", "石榴糖蜜"],
      ["mujadara-hemp-bowl", "Hemp-heart mujadara brown-rice bowls", "火麻仁扁豆糙米飯", "🫘", "veg", "Lentils & hemp hearts", "扁豆與火麻仁", "Brown rice", "糙米", "Caramelized onion & kale", "焦糖洋蔥與羽衣甘藍", "Cumin coriander oil", "孜然芫荽油"],
    ],
  },
  {
    tag: "mediterranean",
    recipes: [
      ["artichoke-lentil-orzo", "Artichoke lentil orzo jars", "朝鮮薊扁豆米粒麵罐", "🫒", "pasta", "Green lentils", "綠扁豆", "Whole-wheat orzo", "全麥米粒麵", "Artichoke & spinach", "朝鮮薊與菠菜", "Lemon oregano dressing", "檸檬奧勒岡醬"],
      ["feta-egg-farro", "Feta egg farro breakfast boxes", "菲達起司蛋法羅麥早餐盒", "🍳", "breakfast", "Eggs & feta", "雞蛋與菲達起司", "Farro", "法羅麥", "Tomato & arugula", "番茄與芝麻葉", "Basil vinaigrette", "羅勒油醋汁"],
      ["orange-salmon-quinoa", "Orange salmon olive quinoa", "柳橙鮭魚橄欖藜麥", "🍊", "western", "Salmon fillets", "鮭魚片", "Quinoa", "藜麥", "Fennel & olives", "茴香與橄欖", "Orange herb glaze", "柳橙香草醬"],
      ["rosemary-beef-ratatouille", "Rosemary beef ratatouille boxes", "迷迭香牛肉普羅旺斯燉菜盒", "🍆", "western", "Lean beef", "瘦牛肉", "Cauliflower mash", "花椰菜泥", "Eggplant & zucchini", "茄子與櫛瓜", "Rosemary tomato jus", "迷迭香番茄汁"],
      ["lemon-chicken-couscous", "Lemon chicken pearl-couscous boxes", "檸檬雞珍珠庫斯庫斯盒", "🍋", "western", "Halal chicken", "清真雞肉", "Pearl couscous", "珍珠庫斯庫斯", "Roasted peppers", "烤甜椒", "Preserved-lemon dressing", "鹹檸檬醬"],
      ["dill-cod-potato", "Dill cod potato green-bean boxes", "蒔蘿鱈魚馬鈴薯四季豆盒", "🐟", "western", "Kosher cod", "猶太潔食鱈魚", "Baby potatoes", "小馬鈴薯", "Green beans", "四季豆", "Mustard dill vinaigrette", "芥末蒔蘿油醋汁"],
      ["white-bean-polenta", "White bean sun-dried tomato polenta", "白豆番茄乾玉米糊", "🍅", "veg", "Cannellini beans", "白腰豆", "Polenta", "玉米糊", "Spinach & sun-dried tomato", "菠菜與番茄乾", "Garlic herb oil", "蒜香草油"],
      ["ginger-turkey-quinoa", "Ginger turkey zucchini quinoa", "薑香火雞櫛瓜藜麥", "🥒", "western", "Turkey breast", "火雞胸", "Quinoa", "藜麥", "Zucchini & carrots", "櫛瓜與胡蘿蔔", "Ginger lemon oil", "薑香檸檬油"],
      ["fig-pork-fennel", "Fig-glazed pork & roasted fennel", "無花果醬豬肉烤茴香", "🌿", "western", "Pork tenderloin", "豬里肌", "Roasted sweet potato", "烤地瓜", "Fennel & arugula", "茴香與芝麻葉", "Fresh fig balsamic", "鮮無花果黑醋醬"],
      ["lupini-quinoa-pepper", "Lupini quinoa roasted-pepper bowls", "羽扇豆藜麥烤椒碗", "🫘", "veg", "Lupini beans", "羽扇豆", "Quinoa", "藜麥", "Roasted peppers & kale", "烤甜椒與羽衣甘藍", "Lemon basil dressing", "檸檬羅勒醬"],
    ],
  },
  {
    tag: "mexican",
    recipes: [
      ["achiote-tofu-rice", "Achiote tofu red-rice boxes", "胭脂樹籽豆腐紅米盒", "🌶️", "veg", "Achiote tofu", "胭脂樹籽豆腐", "Mexican red rice", "墨西哥紅米", "Pickled cabbage", "醃高麗菜", "Orange habanero salsa", "柳橙哈瓦那辣醬"],
      ["egg-poblano-quinoa", "Poblano egg quinoa breakfast bowls", "波布拉諾椒蛋藜麥早餐碗", "🍳", "breakfast", "Eggs & black beans", "雞蛋與黑豆", "Quinoa", "藜麥", "Poblano & tomato", "波布拉諾椒與番茄", "Tomatillo salsa", "綠番茄莎莎"],
      ["tamarind-cod-corn", "Tamarind cod corn-rice boxes", "羅望子鱈魚玉米飯盒", "🐟", "western", "Cod fillets", "鱈魚片", "Corn rice", "玉米飯", "Jicama slaw", "豆薯沙拉", "Tamarind ancho glaze", "羅望子安丘辣椒醬"],
      ["barbacoa-beef-nopales", "Barbacoa beef nopales bowls", "慢燉牛肉仙人掌碗", "🥩", "western", "Lean barbacoa beef", "瘦慢燉牛肉", "Cauliflower rice", "花椰菜米", "Nopales & radish", "仙人掌與蘿蔔", "Guajillo chile sauce", "瓜希柳辣椒醬"],
      ["adobo-chicken-amaranth", "Adobo chicken amaranth boxes", "阿斗波雞莧籽餐盒", "🍗", "western", "Halal chicken", "清真雞肉", "Amaranth", "莧籽", "Roasted squash", "烤南瓜", "Smoky adobo sauce", "煙燻阿斗波醬"],
      ["lime-salmon-potato", "Chile-lime salmon potato boxes", "辣椒萊姆鮭魚馬鈴薯盒", "🐟", "western", "Kosher salmon", "猶太潔食鮭魚", "Roasted potatoes", "烤馬鈴薯", "Green beans", "四季豆", "Chile-lime oil", "辣椒萊姆油"],
      ["pumpkin-seed-bean", "Pumpkin-seed black bean quinoa", "南瓜籽黑豆藜麥碗", "🎃", "veg", "Black beans", "黑豆", "Quinoa", "藜麥", "Roasted corn & peppers", "烤玉米與甜椒", "Pumpkin-seed salsa", "南瓜籽莎莎"],
      ["ginger-turkey-rice", "Ginger turkey calabacita rice", "薑香火雞櫛瓜飯", "🥒", "western", "Lean turkey", "瘦火雞", "White rice", "白飯", "Zucchini & carrots", "櫛瓜與胡蘿蔔", "Ginger cumin oil", "薑香孜然油"],
      ["cacao-pork-plantain", "Cacao-rubbed pork & plantain", "可可香料豬肉烤大蕉", "🍫", "western", "Pork tenderloin", "豬里肌", "Roasted plantain", "烤大蕉", "Cabbage & avocado", "高麗菜與酪梨", "Cacao ancho rub", "可可安丘辣椒香料"],
      ["lentil-pumpkin-mole", "Lentil pumpkin mole rice pots", "扁豆南瓜莫雷醬飯鍋", "🌶️", "veg", "Lentils & hemp hearts", "扁豆與火麻仁", "Brown rice", "糙米", "Pumpkin & kale", "南瓜與羽衣甘藍", "Nut-free mole sauce", "無堅果莫雷醬"],
    ],
  },
  {
    tag: "westAfrican",
    recipes: [
      ["jollof-lentil-rice", "Smoky lentil jollof boxes", "煙燻扁豆喬洛夫飯盒", "🍅", "veg", "Brown lentils", "棕扁豆", "Jollof rice", "喬洛夫飯", "Cabbage & peppers", "高麗菜與甜椒", "Scotch-bonnet tomato sauce", "蘇格蘭帽椒番茄醬"],
      ["egg-egusi-millet", "Egg & spinach egusi millet bowls", "雞蛋菠菜瓜籽小米碗", "🥚", "breakfast", "Eggs & ground melon seed", "雞蛋與瓜籽粉", "Millet", "小米", "Spinach", "菠菜", "Ginger tomato stew", "薑香番茄燉醬"],
      ["suya-salmon-rice", "Suya-spiced salmon rice boxes", "蘇亞香料鮭魚飯盒", "🐟", "western", "Salmon fillets", "鮭魚片", "Brown rice", "糙米", "Cucumber & tomato", "小黃瓜與番茄", "Peanut-free suya spice", "無花生蘇亞香料"],
      ["yaji-beef-greens", "Yaji beef & braised greens", "亞吉香料牛肉燉青菜", "🥩", "western", "Lean beef", "瘦牛肉", "Cauliflower mash", "花椰菜泥", "Collard greens", "羽衣甘藍", "Peanut-free yaji oil", "無花生亞吉香料油"],
      ["kedjenou-chicken-fonio", "Kedjenou chicken fonio bowls", "象牙海岸燉雞福尼奧米碗", "🍗", "western", "Halal chicken", "清真雞肉", "Fonio", "福尼奧米", "Eggplant & tomato", "茄子與番茄", "Ginger chili broth", "薑香辣椒湯汁"],
      ["dill-cod-yam", "Herb cod & roasted yam boxes", "香草鱈魚烤山藥盒", "🐟", "western", "Kosher cod", "猶太潔食鱈魚", "Roasted yam", "烤山藥", "Green beans", "四季豆", "Lemon dill oil", "檸檬蒔蘿油"],
      ["okra-chickpea-fonio", "Okra chickpea fonio pots", "秋葵鷹嘴豆福尼奧米鍋", "🫕", "veg", "Chickpeas", "鷹嘴豆", "Fonio", "福尼奧米", "Okra & tomato", "秋葵與番茄", "Smoked paprika ginger sauce", "煙燻紅椒薑醬"],
      ["ginger-turkey-plantain", "Ginger turkey & green plantain", "薑香火雞青大蕉", "🍌", "western", "Lean turkey", "瘦火雞", "Boiled green plantain", "水煮青大蕉", "Carrot & spinach", "胡蘿蔔與菠菜", "Ginger herb oil", "薑香草油"],
      ["hibiscus-pork-squash", "Hibiscus pork & roasted squash", "洛神花豬肉烤南瓜", "🌺", "western", "Pork tenderloin", "豬里肌", "Roasted squash", "烤南瓜", "Cabbage slaw", "高麗菜沙拉", "Hibiscus pepper glaze", "洛神花胡椒醬"],
      ["black-eyed-pea-hemp", "Black-eyed pea hemp jollof bowls", "黑眼豆火麻仁喬洛夫碗", "🫘", "veg", "Black-eyed peas & hemp hearts", "黑眼豆與火麻仁", "Brown rice", "糙米", "Kale & peppers", "羽衣甘藍與甜椒", "Tomato ginger sauce", "番茄薑醬"],
    ],
  },
  {
    tag: "easternEuropean",
    recipes: [
      ["paprika-lentil-kasha", "Smoked-paprika lentil kasha", "煙燻紅椒扁豆蕎麥飯", "🫘", "western", "Green lentils", "綠扁豆", "Buckwheat kasha", "蕎麥飯", "Mushroom & cabbage", "菇類與高麗菜", "Paprika dill sauce", "紅椒蒔蘿醬"],
      ["egg-beet-kasha", "Egg, beet & horseradish kasha boxes", "雞蛋甜菜根辣根蕎麥盒", "🥚", "breakfast", "Jammy eggs", "溏心蛋", "Buckwheat kasha", "蕎麥飯", "Beets & cucumber", "甜菜根與小黃瓜", "Horseradish yogurt", "辣根優格"],
      ["dill-trout-potato", "Dill trout potato salad boxes", "蒔蘿鱒魚馬鈴薯沙拉盒", "🐟", "western", "Trout fillets", "鱒魚片", "Baby potatoes", "小馬鈴薯", "Green beans & radish", "四季豆與蘿蔔", "Mustard dill vinaigrette", "芥末蒔蘿油醋汁"],
      ["paprika-beef-cabbage", "Paprika beef & braised red cabbage", "紅椒牛肉燉紫高麗菜", "🥩", "western", "Lean beef", "瘦牛肉", "Cauliflower mash", "花椰菜泥", "Braised red cabbage", "燉紫高麗菜", "Caraway pan sauce", "葛縷子肉汁"],
      ["chicken-plov-buckwheat", "Halal chicken buckwheat plov", "清真雞肉蕎麥抓飯", "🍗", "western", "Halal chicken", "清真雞肉", "Buckwheat groats", "蕎麥粒", "Carrot & raisins", "胡蘿蔔與葡萄乾", "Cumin coriander broth", "孜然芫荽高湯"],
      ["salmon-beet-farro", "Salmon beet farro lunch boxes", "鮭魚甜菜法羅麥餐盒", "🐟", "western", "Kosher salmon", "猶太潔食鮭魚", "Farro", "法羅麥", "Beets & dill", "甜菜根與蒔蘿", "Mustard caper dressing", "芥末酸豆醬"],
      ["mushroom-bean-polenta", "Mushroom white-bean polenta pots", "菇菇白豆玉米糊鍋", "🍄", "veg", "White beans", "白豆", "Polenta", "玉米糊", "Mushrooms & spinach", "菇類與菠菜", "Paprika herb oil", "紅椒香草油"],
      ["ginger-turkey-potato", "Ginger turkey potato carrot boxes", "薑香火雞馬鈴薯胡蘿蔔盒", "🥕", "western", "Turkey breast", "火雞胸", "Boiled potatoes", "水煮馬鈴薯", "Carrot & spinach", "胡蘿蔔與菠菜", "Ginger dill oil", "薑香蒔蘿油"],
      ["plum-pork-sauerkraut", "Plum pork & warm sauerkraut", "梅香豬肉溫酸菜", "🐖", "western", "Pork tenderloin", "豬里肌", "Roasted parsnip", "烤歐防風根", "Sauerkraut & apple", "酸菜與蘋果", "Fresh plum caraway glaze", "鮮梅葛縷子醬"],
      ["split-pea-hemp-stew", "Split-pea hemp cabbage stew", "豌豆仁火麻仁高麗菜燉湯", "🫕", "veg", "Split peas & hemp hearts", "豌豆仁與火麻仁", "Buckwheat groats", "蕎麥粒", "Cabbage & carrot", "高麗菜與胡蘿蔔", "Dill paprika broth", "蒔蘿紅椒高湯"],
    ],
  },
];

function ingredient(en: string, zh: string, amount: string, cat: Ingredient["cat"]): Ingredient {
  return { name: { en, zh }, amount: { en: amount, zh: amount }, cat };
}

function expandRecipe(cuisine: string, blueprint: Blueprint, index: number): Recipe {
  const [slug, en, zh, emoji, cat, mainEn, mainZh, baseEn, baseZh, produceEn, produceZh, flavorEn, flavorZh] = blueprint;
  const dietTags = [...DIET_ROTATION[index]];
  const keto = dietTags.includes("keto");
  const highProtein = dietTags.includes("highProtein");
  const vegan = dietTags.includes("vegan");
  const cal = keto ? 520 : vegan ? 475 : highProtein ? 555 : 510;
  const protein = highProtein ? (vegan ? 29 : 41) : vegan ? 22 : 31;
  const carbs = keto ? 17 : vegan ? 67 : 62;
  const fat = keto ? 31 : vegan ? 15 : 18;

  return {
    id: `meal-prep-${cuisine}-${slug}`,
    name: { en, zh },
    emoji,
    cat,
    minutes: 28 + (index % 4) * 4,
    difficulty: index % 5 === 3 ? 2 : 1,
    servings: 4,
    perServing: { cal, protein, carbs, fat },
    ingredients: [
      ingredient(mainEn, mainZh, "4 meal-prep portions", "protein"),
      ingredient(baseEn, baseZh, "4 cups cooked", "carb"),
      ingredient(produceEn, produceZh, "6 cups", "veg"),
      ingredient(flavorEn, flavorZh, "1/2 cup", "sauce"),
    ],
    steps: [
      { en: `Season and cook the ${mainEn.toLowerCase()} until ready.`, zh: `${mainZh}調味後煮至熟。` },
      { en: `Prepare the ${baseEn.toLowerCase()} and ${produceEn.toLowerCase()} while the main component cooks.`, zh: `同時準備${baseZh}與${produceZh}。` },
      { en: `Cool slightly, divide into four containers, and pack the ${flavorEn.toLowerCase()} separately.`, zh: `稍微放涼後分成四盒，${flavorZh}另裝。` },
    ],
    tags: ["mealPrep", "easy", cuisine, ...dietTags],
  };
}

export const EXPANDED_MEAL_PREP_RECIPES: Recipe[] = COLLECTIONS.flatMap((collection) =>
  collection.recipes.map((blueprint, index) => expandRecipe(collection.tag, blueprint, index))
);
