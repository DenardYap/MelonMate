# MelonMate meal planning, recipe, cooking, and nutrition guide

## What the app is

MelonMate (Traditional Chinese: **瓜瓜日誌**) is an iPhone-first, bilingual food-and-fitness app for two partners. Its food system connects five jobs that are often split across separate apps:

1. Decide what to cook during a Monday–Sunday week.
2. Turn those planned recipes into a grocery list.
3. Estimate and record food costs in New Taiwan dollars.
4. Log what was actually eaten, with calories and protein/carbohydrate/fat totals.
5. Reward consistent calorie and protein goal completion with a melon-themed streak game.

The main food loop is:

```text
Choose profile and goals
        ↓
Plan recipes by day and meal
        ↓
Generate grocery list and shop
        ↓
Open a recipe and log the cooked servings
        ↓
See daily nutrition, cost, and goal progress
        ↓
Grow a melon when the day's nutrition goal is met
```

The application also contains a complete workout tracker. This document concentrates on the meal-planning, recipe, cooking, grocery, cost, and nutrition features, while noting profile, backup, language, and gamification behavior that affects the food experience.

## Research basis

This guide was assembled from the implemented Next.js source, its persisted data model, bilingual copy, seed catalogs, nutrition calculations, source cooking-list PDF (`瓜飼料🥔`), and an iPhone-sized walkthrough of the running application. Where the original product intent is broader than the current implementation, the difference is called out under **Current boundaries and caveats** rather than presented as a shipped feature.

## Information architecture

MelonMate is a mobile-width web application with a floating bottom navigation bar:

| Area | Food-related purpose |
| --- | --- |
| **Today** | Daily calorie and macro dashboard, meal log, food cost, streak status, and fast logging entry points. |
| **Kitchen** | Recipe library, weekly meal planner, and grocery list. |
| **Central ＋** | Opens the fast food-entry workflow. |
| **Gym** | Workout planning and logging; indirectly contributes golden melons and XP. |
| **Me** | Profiles, nutrition goals, language and units, weight/spend history, melon garden, and backup/restore. |

The interface defaults to English and can be switched to Traditional Chinese. Dates are local-calendar dates, weeks begin on Monday, and the layout is optimized for a narrow iPhone viewport with safe-area handling, bottom sheets, large touch targets, and automatic light/dark appearance.

## Profiles and personalization

The active profile determines the nutrition goals, food diary, weight history, workout history, and gamification state the app reads and updates. The weekly planner, groceries, recipe collection, custom-food catalog, and favorites are shared household data. In practice, Bernard and 瓜瓜 can maintain separate intake totals while contributing to the same cooking plan and shopping list.

Each profile contains:

- A name and emoji.
- Daily calorie, protein, carbohydrate, and fat goals.
- A preferred body-weight unit (`lb` or `kg`).
- A linked workout plan.

The two seeded profiles are Bernard (🍈; 2,200 cal, 160 g protein, 230 g carbs, 65 g fat) and 瓜瓜 (🍉; 1,600 cal, 100 g protein, 170 g carbs, 55 g fat). First-run onboarding chooses English or Traditional Chinese and can rename both profiles. Later, **Me** can edit each profile's name, emoji, four nutrition goals, and weight unit. This is a shared-device model, not a cloud household account: changing profiles changes the personal local data context but deliberately leaves household planning data in place.

## Today: daily nutrition and eating dashboard

### Automatic daily reset

Every food entry carries a local `YYYY-MM-DD` date. The Today screen computes its totals only from the active profile's entries for the current date. As the calendar date changes, the visible counters begin at zero without deleting prior entries. Older entries remain in storage and feed streak/spend calculations and backup, although the current UI has no past-day diary browser.

### Calorie and macro progress

The dashboard summarizes:

- Calories eaten against the daily calorie budget.
- Calories remaining, or the amount over budget.
- Protein consumed against the protein goal.
- Carbohydrate consumed against the carbohydrate goal.
- Fat consumed against the fat goal.

Calories use a prominent circular progress treatment, while protein, carbs, and fat use separately colored progress indicators. Values are derived by summing the macros stored on all of that day's log entries.

### Meal timeline

Entries are organized into four meal slots in a fixed order:

1. Breakfast
2. Lunch
3. Dinner
4. Snack

A logged item retains its display name in both languages, optional emoji, amount in grams, calories/macros, cost, time logged, source type, and a reference back to a built-in food or recipe when applicable. Source types distinguish normal food search, recipe cooking, manual entry, voice entry, and barcode entry.

Tapping an existing diary row opens an editor. The item can be moved to another meal, its gram amount can be changed in 5 g or 50 g steps, and it can be deleted. Changing grams scales the entry's existing macros and cost proportionally; it does not re-query the original catalog. Recipe/manual entries without a stored gram amount can be moved or deleted but do not expose gram scaling.

### Daily cost

The Today view totals the `cost` values attached to that day's entries. Built-in foods can estimate cost from quantity and their USD-per-100-g values; recipe logs use the recipe's per-serving cost. Manually entered cost can also contribute.

Today also accepts one body-weight value for the active profile and current date; logging again on the same date replaces that day's value. **Me** renders a weight trend from up to the 30 most recent records once at least two exist, and a separate food-spend chart sums logged-food costs over the trailing seven dates. These are personal profile histories, unlike the shared grocery budget.

### Empty and success states

When nothing is logged, the app points the user toward the central add button, voice entry, or barcode scanning. When the nutrition rule for the day is satisfied, the dashboard changes to the ripe-melon success state rather than only showing raw numbers.

## Logging food

The central add flow is designed around four input modes: **Search**, **Voice**, **Scan**, and **Manual**. All modes ultimately create the same dated meal-log record, so the dashboard calculations do not depend on how food was entered.

### Search and quick add

The searchable catalog combines built-in foods, saved custom foods, and recipes. Search is a case-insensitive substring match against the English name or a direct substring match against the Chinese name; it is bilingual but not typo-tolerant/fuzzy. A typed query shows at most 30 matching foods and 10 recipes. With no query, four filters are available:

- **Recent:** up to 12 distinct foods from the active profile's log, newest first. Recipe logs do not appear in this filter.
- **Favorites:** foods starred by either partner; favorites are household-shared.
- **All:** every built-in and custom food.
- **Recipes:** the shared recipe collection.

A food can have:

- Calories, protein, carbs, and fat per 100 g (or approximately per 100 ml for liquids).
- A common serving label and gram equivalent, such as one egg or one bowl.
- A food category.
- An estimated price per 100 g.
- An emoji and bilingual name.

The user selects a common serving or grams, chooses breakfast/lunch/dinner/snack, reviews the scaled macros and estimated price, and logs it. Common servings can be adjusted in half-serving steps; gram amounts in 5 g or 50 g steps. Recipes use half-serving steps. Foods—not recipes—can be starred from the portion sheet.

### Quantity and nutrition scaling

For foods stored per 100 g, the app scales values linearly:

```text
logged nutrient = per-100-g nutrient × entered grams ÷ 100
estimated cost  = USD per 100 g × entered grams ÷ 100
```

Calories are rounded to whole kilocalories; protein, carbs, and fat are rounded to one decimal place.

### Voice logging

Voice entry is intended for both English and Chinese phrases such as:

- “chicken breast 200 grams”
- “兩顆蛋 一碗飯”

The browser's speech-recognition capability supplies the transcript, using `en-US` in English mode and `zh-TW` in Chinese mode. The parser then matches spoken recipe names first and food names second, preferring the longest catalog match. It interprets:

- Explicit grams (`g`, `gram`, `克`, `公克`).
- Milliliters (`ml`, `cc`, `毫升`), treated as an equal numeric gram amount for macro scaling.
- Counted units such as pieces, servings, bowls, cups, slices, bars, cans, eggs, scoops, 顆, 份, 碗, 杯, 片, 條, 根, 匙, and 隻.
- English number words from a/an/one through ten, half, and quarter.
- Arabic numbers and Chinese forms using 零、一、二／兩 through 九, 十, 百, 千, and 半.
- An optional spoken meal name; otherwise the UI can use the time-based default (breakfast before 10:30, lunch before 15:00, dinner before 21:00, then snack).

Phrases are split at commas and connectors such as “and,” “with,” `和`, `跟`, `還有`, and `加上`, allowing multiple candidates from one utterance. A food with no spoken amount uses its common serving or 100 g; a recipe defaults to one serving. Matched items are shown for confirmation before logging. If speech recognition is unavailable, the UI directs the user to Safari/Chrome or another input mode.

### Barcode scanning

The scanner uses the phone camera and a moving scan region to read common product barcodes. A successful decode gives an audio beep. The code is looked up through Open Food Facts with an eight-second timeout; returned per-100-g calories (including conversion from kJ when needed), protein, carbs, fat, product names, and serving quantity are normalized into MelonMate's format. Products returned by the service enter the generic snack category and have no automatic price.

The flow accounts for three important cases:

- A product is found and can be reviewed/logged.
- A product has been scanned and saved before, allowing reuse of the locally stored custom item; Scan shows up to eight of these recent saved products.
- No database match exists, in which case the user can enter the product manually and retain it locally for a later scan.

Camera-denied or camera-unavailable states are handled with a clear fallback to search/manual entry.

### Manual entry

Manual entry covers foods not in the catalog and incomplete barcode results. The form captures a required name and calories, optional protein/carbs/fat, meal slot, and optional cost. These macros describe the single diary entry; there is no separate amount field in this form. “Save to my foods” optionally creates a reusable custom item whose entered macros are treated as a 100 g/one-serving equivalent. Its current manual cost is logged but is **not** retained as the custom food's future per-100-g price. For an unknown barcode, saving is enabled by default and the code is attached to that custom item.

## Built-in food catalog

The implemented seed catalog contains **87 foods** with bilingual names and typical nutrition values: 19 protein items, 14 carbohydrates, 10 sauces, 14 vegetables, 9 fruits, 8 dairy items, 5 fats, 3 snacks, and 5 drinks. It spans:

| Category | Examples |
| --- | --- |
| Protein | Chicken breast/thigh/wings, pork, sirloin, salmon, shrimp, eggs, tofu, fish balls, whey, ham. |
| Carbohydrates | White/sesame/brown rice, udon, ramen, cup noodles, pasta, breads, potatoes, oats. |
| Vegetables | Green beans/peas, broccoli, spinach, cabbage, bok choy, mushrooms, onions, carrots, tomatoes. |
| Fruit | Banana, apple, honeydew, cantaloupe, watermelon, berries, avocado, grapes. |
| Dairy | Milk, yogurt, Greek yogurt, cheeses, cream, soy milk. |
| Fats and sauces | Oils, mayonnaise, peanut butter, pesto, pasta sauces, soy sauce, dashi, mirin, honey. |
| Snacks and drinks | Dark chocolate, almonds, protein bars, bubble tea, coffee, latte, Coke Zero, beer. |

The values are seed estimates, not a branded nutrition authority. Prices are stored and displayed in U.S. dollars and can differ significantly by store, brand, season, and package size.

## Kitchen: recipe library and cooking

### Recipe structure

Every recipe stores:

- English and Traditional Chinese name.
- Emoji and category.
- Estimated cooking time.
- Difficulty from 1–3.
- Default number of servings.
- Calories, protein, carbs, and fat per serving.
- Estimated USD cost per serving.
- Ingredient list with bilingual names, display amounts, category, and estimated cost.
- Search/filter tags.
- Whether it is a custom recipe.

The recipe categories are Asian, Western, pasta, breakfast, vegetables, and custom/“ours.” The library can be browsed with category filters and recipe cards expose the fast comparison attributes: time, difficulty, calories/macros, servings, and price.

### Recipe detail actions

From a recipe, the user can:

- Review nutrition and estimated price per serving.
- Review the ingredient list and quantities.
- Choose how many servings were cooked/eaten in half-serving steps.
- **Cook/log** the recipe to today's food diary.
- Add the recipe to a day and meal slot in the weekly plan.
- Add its ingredients directly to the grocery list.
- Edit the recipe, including built-in recipes.

Cooking a recipe creates one meal-log entry whose nutrition and cost are the recipe's per-serving figures multiplied by the selected serving count. It is assigned to the time-based current meal (before 10:30 breakfast, before 15:00 lunch, before 21:00 dinner, otherwise snack); recipe detail does not offer a meal selector. The entry is identified as recipe-sourced and keeps the recipe ID for traceability.

### Custom recipes

“New recipe” captures emoji, name, category, default batch servings, time, 1–3 difficulty, per-serving nutrition and price, and any number of ingredients. Each ingredient has a name, free-form amount, and estimated cost. Custom recipes are marked separately and can be deleted. Both custom and built-in recipes can be edited. A built-in has no delete action on its first edit, but saving that edit marks it as custom; after it is reopened, it can be deleted like a user-created recipe.

The form is localized rather than truly bilingual: the entered/edited recipe and ingredient text is copied into both language fields. Editing a seeded recipe while one language is active therefore replaces both of its language variants with the visible text. Custom ingredient categories and recipe tags are not editable in the form.

## Seed recipe collection

The built-in collection contains **27 recipes** derived from the attached one-page `瓜飼料🥔` cooking list: 10 Asian, 8 Western, 3 pasta, 4 breakfast, and 2 vegetable recipes. It covers the following source ideas; nutrition and price figures are planning estimates rather than authoritative recipes:

- **Asian:** tamagoyaki with sesame rice and meat, chawanmushi, mini hotpot, udon with broth/fish balls/narutomaki, skewers, egg fried rice with Chinese sausage, ramen eggs with cup noodles, jajangmyeon with fried egg and green onions, Japanese curry with rice, nasi goreng kampung.
- **Western/non-Asian:** sirloin with greens, mushroom cream soup with cheesy garlic bread, chicken wings, French toast, salmon with sides, pork chop with greens, mashed potatoes, Parmesan chicken with greens.
- **Pasta:** pesto chicken pasta, tomato chicken pasta, Alfredo chicken pasta.
- **Breakfast:** mayonnaise egg sandwich, Taiwanese sandwich, avocado toast sandwich, protein smoothie with fruit.
- **Vegetables:** green beans and green peas.

### Built-in recipe comparison

The table shows the default app values per serving. “Serves” is the recipe's default batch size, while cal, protein, and price are explicitly per serving.

| Recipe | Category | Time | Difficulty | Serves | cal | Protein | Est. USD/serving |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Tamagoyaki + sesame rice + meat / 玉子燒＋芝麻飯＋肉肉 | Asian | 25 min | 2/3 | 2 | 620 | 32 g | 95 |
| Chawanmushi / 茶碗蒸 | Asian | 30 min | 2/3 | 2 | 130 | 11 g | 40 |
| Tiny hotpot / 小火鍋 | Asian | 30 min | 1/3 | 2 | 520 | 35 g | 150 |
| Udon with broth, fish balls, and narutomaki / 烏龍麵＋魚丸＋鳴門卷 | Asian | 20 min | 1/3 | 2 | 450 | 22 g | 80 |
| Skewers / 串燒 | Asian | 35 min | 2/3 | 2 | 480 | 38 g | 140 |
| Egg fried rice with Chinese sausage / 香腸蛋炒飯 | Asian | 15 min | 1/3 | 2 | 650 | 20 g | 60 |
| Ramen eggs + Asian cup noodles / 溏心蛋＋泡麵 | Asian | 15 min | 1/3 | 1 | 560 | 22 g | 75 |
| Jajangmyeon + fried egg and green onion / 炸醬麵＋煎蛋＋蔥花 | Asian | 25 min | 2/3 | 2 | 680 | 24 g | 85 |
| Japanese curry + rice / 日式咖哩飯 | Asian | 40 min | 1/3 | 4 | 640 | 26 g | 90 |
| Nasi goreng kampung / 印尼炒飯（進階） | Asian | 45 min | 3/3 | 2 | 620 | 24 g | 110 |
| Sirloin steak + greens / 沙朗牛排＋青菜 | Western | 25 min | 2/3 | 2 | 520 | 45 g | 240 |
| Mushroom cream soup + cheesy garlic bread / 蘑菇濃湯＋起司大蒜麵包 | Western | 40 min | 2/3 | 2 | 560 | 16 g | 110 |
| Chicken wings / 烤雞翅 | Western | 45 min | 1/3 | 2 | 430 | 34 g | 90 |
| French toast / 法式吐司 | Western | 15 min | 1/3 | 2 | 480 | 16 g | 55 |
| Pan-seared salmon + sides / 香煎鮭魚＋配菜 | Western | 25 min | 2/3 | 2 | 540 | 38 g | 190 |
| Pork chop + greens / 香煎豬排＋青菜 | Western | 25 min | 1/3 | 2 | 520 | 40 g | 120 |
| Mashed potatoes / 奶油薯泥 | Western | 30 min | 1/3 | 4 | 220 | 4 g | 30 |
| Parmesan chicken + greens / 帕瑪森起司雞＋青菜 | Western | 35 min | 2/3 | 2 | 590 | 48 g | 150 |
| Pesto pasta + chicken / 青醬雞肉義大利麵 | Pasta | 25 min | 1/3 | 2 | 720 | 42 g | 130 |
| Tomato pasta + chicken / 紅醬雞肉義大利麵 | Pasta | 25 min | 1/3 | 2 | 640 | 40 g | 110 |
| Alfredo pasta + chicken / 白醬雞肉義大利麵 | Pasta | 25 min | 1/3 | 2 | 780 | 42 g | 125 |
| Mayo egg sandwich / 美乃滋蛋沙拉三明治 | Breakfast | 10 min | 1/3 | 2 | 380 | 14 g | 40 |
| Taiwanese sandwich / 台式三明治 | Breakfast | 12 min | 1/3 | 2 | 420 | 20 g | 45 |
| Avocado toast sandwich / 酪梨吐司 | Breakfast | 10 min | 1/3 | 1 | 420 | 14 g | 55 |
| Protein smoothie + fruit / 蛋白果昔 | Breakfast | 5 min | 1/3 | 1 | 320 | 32 g | 70 |
| Garlic green beans / 蒜炒四季豆 | Vegetables | 10 min | 1/3 | 2 | 90 | 3 g | 25 |
| Buttered green peas / 奶油豌豆 | Vegetables | 8 min | 1/3 | 2 | 130 | 6 g | 25 |

## Weekly meal planner

### Week model

The planner uses a Monday-start seven-day week. Each date has the same four meal slots as the food diary. A slot may hold one or more planned recipes, and each planned item stores its own serving count.

### Planning workflow

The core planner workflow is:

1. Open **Kitchen → Planner**.
2. Navigate to the desired week.
3. Tap a day/meal slot.
4. Pick a recipe.
5. The planner inserts that recipe's default batch-serving count.
6. Repeat for the rest of the week.

Multiple recipes can be added to the same slot, and any planned item can be removed from its slot. Previous and future weeks can be reached with arrow controls. Recipe detail offers a ten-day shortcut picker (the current Monday–Sunday week plus the next three days); the full Planner can navigate farther.

The planner summarizes estimated average calories across only the days that contain a plan, plus total planned food cost. The cost multiplies recipe price by planned servings. The current calorie summary, however, adds one per-serving calorie value for each planned recipe and does **not** multiply by planned servings; this makes the displayed planned-calorie average/day total lower than the food implied by multi-serving plans. The planner also surfaces a batch-prep suggestion to cook reusable staples such as rice and proteins ahead of time.

The plan is prospective: adding a recipe to the week does not itself count as food eaten. Food affects Today only when it is explicitly cooked/logged.

## Grocery list

### Sources of grocery items

Items can enter the grocery list in three ways:

- Add one stored batch of all ingredients from a recipe detail. This action does not scale to the cook-serving stepper.
- Build the list from the recipes and servings in the current weekly plan.
- Add an ad-hoc grocery item manually.

### Grocery item behavior

Each item stores a bilingual name, display quantity, estimated USD cost, optional actual cost, purchased checkbox, and food category. Category is retained in data but the current grocery view does not group or label rows by it. The grocery view provides:

- Purchased/unpurchased checking.
- Estimated total.
- Actual amount spent when supplied.
- Manual item entry.
- Clearing checked items.
- Individual deletion and separate unpurchased/purchased sections.

The week-generation path scales ingredient **cost** by planned servings divided by the recipe's default batch servings. It consolidates ingredients whose English names are exactly equal ignoring case. Quantity remains free-form text: the first occurrence keeps the recipe amount string, while repeats become that same string followed by `×N`, where N is the number of occurrences—not a unit-converted total. Generated/direct items are appended to the existing list; generation does not replace it or de-duplicate against rows that are already there.

### Estimated versus actual spend

The app intentionally keeps two grocery cost concepts:

- **Estimated** is the sum across every current row, purchased or not.
- **Spent/actual** includes only checked rows, using the entered actual price when present and falling back to the estimated price otherwise.

Checking a row directly marks it bought without asking for a price. Tapping its price opens the actual-price editor and also checks the row. Manual grocery entry initially captures only a name with zero estimate, so its price must be filled through that editor. Checked rows can be unchecked or permanently cleared in bulk. Daily food-spend reporting comes from logged food entries, while grocery spent comes from grocery-item purchase values. They are related budgeting views but not the same accounting ledger.

## Nutrition goals and melon gamification

The food game is tied to meaningful behavior rather than logging frequency alone:

- Every food log awards 10 XP.
- A completed past day earns a melon when calories are no more than 110% of the profile goal **and** protein is at least 80% of the profile goal.
- Consecutive successful days increase the current streak.
- The longest run is retained as the best streak.
- Successful nutrition days grow normal melons in the garden.
- Workout personal records grow golden melons.
- XP drives a visible level/progression treatment.
- A date-indexed history records whether each evaluated day met the goal.

Goal reconciliation evaluates completed days through yesterday (up to 400 unevaluated days per pass). A logged day that misses the rule resets the streak. A day with no entries is recorded as unsuccessful but **pauses rather than resets** the streak, making the system intentionally forgiving. A successful food day awards one melon and 50 XP. Workout completion uses a separate XP formula and adds a golden melon for each detected personal record.

The Today screen previews whether the current day's melon is ripe using the same 110%/80% thresholds. The Me screen shows a 14-day garden (successful days as melons, today as a seed), melon totals, golden-melon totals, current/best streak, XP, and the rule explanation. Level is `floor(sqrt(XP ÷ 60)) + 1`, with a progress bar toward `level² × 60` XP.

## Language, date, units, and money behavior

- English is the default language; Traditional Chinese can be toggled in-app.
- Food, recipe, ingredient, exercise, navigation, empty-state, success, and error copy are bilingual.
- Local dates are used instead of UTC dates for meal attribution and daily reset.
- Weeks start Monday.
- Body weight can be labeled in pounds or kilograms by profile. Switching units does not convert already stored measurements or goal/seed weights.
- Food prices are designed around New Taiwan dollars and formatted as whole-dollar estimates.
- Nutrition amounts are fundamentally gram-based, including gram equivalents for common servings.

## Data storage, privacy, backup, and offline behavior

MelonMate is a local-first application:

- Zustand manages application state.
- Persisted state lives in the browser on the device.
- There is no required account, server-side food diary, or cloud household sync in the current architecture.
- Personal logs, weight, workout sessions, and game state are separated by profile; household recipes, planning, groceries, custom foods, and favorites are shared. Profiles do not create access control between partners.
- Export downloads the raw persisted Zustand JSON wrapper as `melonmate-backup-YYYY-MM-DD.json`.
- Import accepts JSON only when it contains the expected persisted `state.profiles` shape, replaces the local persisted value, and reloads the app.
- “Erase all data” is a destructive local reset with a confirmation warning.
- The profile screen recommends regular exports for backup and moving data between phones.

The app is packaged as an installable web app with iPhone standalone metadata, a home-screen icon, theme color, safe-area support, and a basic offline shell. Barcode product lookup and browser speech recognition still depend on browser/device capability, and product lookup requires network access unless the barcode was already saved locally.

The production-only service worker precaches the five top-level routes and manifest. Same-origin navigations use network-first caching with the app root as the final offline fallback; static same-origin assets use cache-first. Cross-origin calls such as Open Food Facts are intentionally not intercepted.

## Connected workout features

Although food and cooking are this document's focus, MelonMate's other major feature area is a profile-specific hypertrophy tracker. It matters to the overall experience because completed work and personal records add XP and golden melons.

- **Two seeded eight-week plans:** Bernard's imported four-day hypertrophy program (two four-week blocks with recorded seed weights) and 瓜瓜's four-day, roughly 60-minute upper/lower plan repeated for eight weeks. Either profile can switch to either plan.
- **Next-workout sequencing:** completed-session count selects the next week/day; an unfinished session can be resumed from Today or Gym.
- **Workout preview and history:** exercise/set counts, week overview, plan note, and the most recent 14 completed sessions with duration, volume, and PR count.
- **Live set logger:** weight, reps, optional RPE, set completion, extra sets, form-cue reveal, elapsed time, and per-exercise target reps/RPE/rest.
- **Progressive-overload memory:** a new session pre-fills weight from the latest completed sets for the same normalized exercise, falling back to the imported seed weight.
- **Rest timer:** completing a set starts the exercise's rest countdown; the user can skip or add 15 seconds, and an audio beep marks completion.
- **PR detection:** estimated one-rep max uses the Epley formula. Live and finish-time comparisons detect improvements against prior completed sessions.
- **Finish/discard:** at least one set must be completed before finishing. Finish records duration, total volume, and PRs and shows a summary; discard removes the open session after confirmation.
- **Editable plans:** switch plans, choose weeks, edit an exercise's name/sets/reps/RPE/rest, reorder or delete exercises, add from the bilingual exercise library or a custom name, and copy the current week into the next week.
- **Progress views:** per-exercise estimated-1RM line and up/flat/down trend, six-week volume bars, latest-week volume by muscle group, and the last completed sets.
- **Workout rewards:** finishing awards 40 XP plus 5 XP per completed set and 30 XP per PR; each PR also grows one golden melon.

## Key calculations and rules

| Calculation | Rule |
| --- | --- |
| Food macros | Per-100-g values × grams ÷ 100. |
| Food cost | Price per 100 g × grams ÷ 100. |
| Recipe log | Per-serving macros/cost × servings logged. |
| Daily totals | Sum of the active profile's entries matching the local date. |
| Meal totals | Sum of the matching date and meal slot. |
| Planned cost | Recipe cost per serving × planned servings. |
| Displayed planned calories | One per-serving calorie value per planned recipe; currently does not scale by planned servings. |
| Generated grocery estimate | Ingredient cost × planned servings ÷ recipe default batch servings. |
| Daily reset | Date filtering; history is retained, not zeroed or deleted. |
| Daily food spend | Sum of costs on that profile's food-log entries for the date. |
| Seven-day spend | Sum of logged food costs across the recent seven-day window. |
| Successful nutrition day | Calories ≤ 110% of goal and protein ≥ 80% of goal, evaluated after the day ends. |
| Food XP | +10 XP per added food-log record; +50 XP for a reconciled successful nutrition day. |

## End-to-end scenarios

### Plan, shop, cook, and log a weeknight dinner

1. Select the correct partner profile.
2. Open Kitchen and inspect recipe cards for time, cost, difficulty, and nutrition.
3. Add a recipe to Wednesday dinner. The planner uses that recipe’s default batch serving count; it does not currently offer a serving-count editor.
4. Build the grocery list from the weekly plan.
5. Check items while shopping and enter actual costs where useful.
6. On Wednesday, open the recipe and log the servings actually eaten.
7. The dinner entry immediately updates calories, macros, daily spend, and melon-goal progress.

### Log a packaged snack

1. Open the central add flow and choose Scan.
2. Allow camera access and scan the product barcode.
3. Review the Open Food Facts nutrition result and quantity.
4. Choose Snack and log it.
5. If the code is unknown, complete the manual values and save the product for future scans.

### Log a repeated breakfast by voice

1. Open Voice from the add flow.
2. Choose English or Chinese speech mode, then say the foods and amounts. The parser knows aliases in both languages, although recognition itself uses the selected locale.
3. Review the matched catalog foods and quantities.
4. Confirm Breakfast.
5. The normalized entries appear in the breakfast section and count toward goals exactly like search-added foods.

## Current boundaries and caveats

These constraints are important for understanding what the app does **not** currently promise:

- Nutrition values and Taiwan prices are estimates; there is no dietitian validation, store-price feed, or guarantee of branded-product accuracy.
- The recipe model focuses on meal metadata, nutrition, ingredients, time, difficulty, planning, groceries, and logging. It does not model ordered cooking steps, step timers, photos/video, equipment, oven temperatures, or hands-free cooking mode.
- Meal planning is manual. There is no automatic plan optimizer for budget, macro targets, ingredient reuse, available pantry stock, or cooking time.
- There is no pantry/inventory, expiration tracking, leftover tracking, or “already have this” subtraction before grocery generation.
- Grocery quantities are display strings, so robust unit conversion and consolidation across differently expressed amounts are limited.
- Planning a meal and logging a meal are separate actions; the app does not automatically reconcile planned versus actually eaten food.
- Local profiles are not real user accounts. There is no authentication, real-time sharing, push sync, permissions, or conflict resolution between two phones.
- Export/import is the transfer mechanism; users must remember to back up.
- Speech recognition quality depends on the browser/OS and may not understand every bilingual phrase or portion expression.
- Open Food Facts coverage and label quality vary by product and region. Users should verify scanned nutrition against the package.
- Cost reporting is not a full household accounting system: grocery actuals and consumed-food costs are separate views.
- The planner stores a recipe’s default serving count without an editing control. Its cost summary multiplies by that count, but its calorie summary currently counts one per-serving calorie value per planned recipe rather than multiplying by servings.
- There is no historical diary calendar or day detail. Past meal records are retained, but the visible historical food views are the trailing seven-day spend and evaluated garden/streak history.
- Changing `lb`/`kg` changes the label and future entry context; it does not convert existing weight records.
- The catalog is finite. Custom foods are stored only in the current local app data unless exported, and there is no custom-food edit/delete screen.
- Prices and grocery currency are fixed to U.S. dollars; there is no currency selector in the current interface.

## Implementation map

The food system is implemented primarily in these files:

| Source | Responsibility |
| --- | --- |
| `lib/types.ts` | Food, recipe, meal plan, grocery, profile, goals, log, workout, and gamification data contracts. |
| `lib/foods.ts` | Built-in bilingual nutrition and Taiwan price catalog. |
| `lib/recipes.ts` | Seed recipes derived from the cooking-list PDF. |
| `lib/nutrition.ts` | Macro scaling, summation, rounding, money formatting, and related calculations. |
| `lib/dates.ts` | Local-date serialization, Monday weeks, date math, and bilingual formatting. |
| `lib/i18n.ts` | English/Traditional Chinese interface dictionary and meal ordering. |
| `lib/store.ts` | Persisted profiles, logs, planning, grocery, recipes/custom foods, goals, backup, and gamification actions. |
| `app/` | Today, Add, Kitchen, Gym, Me, onboarding, and supporting interactive screens. |

## Feature inventory at a glance

- Two-partner, locally switched profiles.
- Per-profile calories, protein, carbs, and fat goals.
- Automatic date-based daily dashboard reset with retained history.
- Calorie ring plus protein/carb/fat progress.
- Breakfast, lunch, dinner, and snack diary sections.
- Food logging by bilingual substring search, common serving, grams, voice, barcode, or manual macros.
- 87 built-in bilingual foods with typical nutrition and Taiwan price estimates.
- Custom foods and locally remembered barcode products.
- Recipe library with category, time, difficulty, servings, macros, cost, ingredients, and tags.
- Cook-to-log recipe action.
- Recipe-to-plan and recipe-to-grocery actions.
- Custom recipe support.
- Monday-start, seven-day, four-meal-slot planner using each recipe’s default serving count.
- Planned calorie average and weekly cost estimate.
- Grocery generation from plan (exact-name consolidation), direct recipe ingredients, and manual items.
- Grocery check-off, estimated/actual totals, and clear-checked action.
- Daily and seven-day food-spend summaries.
- Nutrition-day melons (≤110% calories and ≥80% protein), forgiving streak/current best, XP/level, and garden history.
- English/Traditional Chinese toggle.
- Local-first persistence, JSON export/import, and local erase.
- Installable iPhone-oriented web app, automatic dark mode, and basic offline shell.
