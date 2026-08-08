# MelonMate Fitness App: Existing Product Research and Feature Plan

**Audit date:** August 7, 2026  
**Workspace:** `food + fitness`  
**Package name:** `melonmate`  
**Purpose of this document:** Explain how the current codebase works, inventory every fitness and food feature represented in it, identify what is actually runnable, and preserve the intended product behavior for implementation.

---

## 1. Executive summary

MelonMate is designed as a mobile-first, bilingual food and strength-training companion. Its core product idea is to put calorie and macro tracking, budget-aware meal planning, grocery management, structured workout logging, weight tracking, and light gamification into one app.

The existing repository is **not yet a functioning application**. It contains a strong domain model, local-date utilities, a detailed responsive visual system, and the dependencies needed for local state and barcode scanning. It does not contain an app layout, pages, components, state store, seed data, persistence layer, API client, authentication, or tests. A production build succeeds, but it generates only Next.js's automatic `/404` route.

Therefore, the most accurate description is:

- The **product contract is well defined** in TypeScript.
- The **intended interface and interaction patterns are well defined** in CSS.
- The **runtime workflows are not implemented yet**.
- Several features are strongly indicated by fields, dependencies, comments, and dedicated CSS, but their detailed rules are still unspecified.

This document never treats a schema or CSS class as proof that a user can already complete the corresponding workflow.

---

## 2. Evidence and confidence model

### Sources reviewed

- `package.json` and the installed dependency tree
- `lib/types.ts`
- `lib/dates.ts`
- `app/globals.css`
- Next.js, TypeScript, Tailwind, and PostCSS configuration
- The complete workspace file inventory, including hidden project files
- Git status and history for this directory
- TypeScript validation with `npx tsc --noEmit`
- Production validation with `npm run build`

### Status labels used below

| Status | Meaning |
|---|---|
| **Implemented foundation** | Working code exists for the underlying utility, styling, type, or build behavior. |
| **Defined contract** | A concrete TypeScript model exists, but no user workflow uses it yet. |
| **Strongly implied** | Multiple code signals point to the feature, such as a model field plus a dependency or dedicated UI style. |
| **Unspecified** | The current repository does not define the behavior, even if the product may eventually need it. |
| **Not present** | No implementation or product contract for the capability was found. |

---

## 3. Current technical state

### Stack

| Area | Current choice | What exists now |
|---|---|---|
| Framework | Next.js 15 | Configuration is present; no app routes or page components exist. |
| UI runtime | React 19 | Installed; no React components exist. |
| Language | TypeScript, strict mode | Domain and date files type-check successfully. |
| Styling | Tailwind CSS 4 plus custom global CSS | A complete mobile visual foundation exists. |
| Client state | Zustand 5 | Dependency is installed; no store exists. |
| Barcode scanning | ZXing browser and library packages | Dependencies and scanner styling exist; scanner logic does not. |
| Persistence | Unspecified | No local storage, IndexedDB, database, or remote API implementation exists. |
| Backend | Not present | No route handlers, server actions, database schema, or API client exists. |
| Testing | Not present | No unit, component, or end-to-end test setup exists. |

Installed versions can be newer than the ranges written in `package.json` because the lockfile currently resolves Next.js 15.5.23, React 19.2.8, Zustand 5.0.14, Tailwind 4.3.3, and TypeScript 5.9.3.

### Runtime verification

- `npx tsc --noEmit` completes successfully.
- `npm run build` completes successfully.
- The build output contains no product route. It contains only the statically generated `/404` page.
- `npm run lint` is not automation-ready: `next lint` is deprecated and opens an interactive ESLint setup prompt because no lint configuration exists.
- There is no `app/layout.tsx`, `app/page.tsx`, Pages Router page, or API route.

### Architectural shape implied by the code

The app is designed around a local-first client experience:

1. A profile supplies nutrition targets, preferred weight unit, and selected workout plan.
2. Date-keyed food logs, meal plans, weight entries, workout sessions, and game history form the user's longitudinal record.
3. Catalog entities such as foods, recipes, and workout plans are referenced by ID.
4. Daily summaries can be derived from logs rather than stored separately.
5. Zustand is the likely intended state layer, but store structure, persistence, migrations, and synchronization are not defined.

This local-first interpretation is an inference from the dependency set and models, not an implemented data architecture.

---

## 4. Intended product experience

### Audience and market signals

The code points to a consumer fitness app for English- and Traditional Chinese-speaking users, likely with Taiwan as an initial market:

- Every named food, recipe, ingredient, exercise, workout day, plan, and coaching cue can have English and Chinese text.
- Grocery and food prices are explicitly described in NT dollars.
- Date and duration utilities generate English or Chinese labels.
- The system font stack includes `PingFang TC`, `Noto Sans TC`, and `Microsoft JhengHei`.
- Weight can be recorded in pounds or kilograms.

### Product pillars

1. **Know today's nutrition status** through calorie and macro goals.
2. **Log food quickly** from a catalog, recipe, manual entry, voice, or barcode.
3. **Plan affordable meals** with servings, ingredient costs, and groceries.
4. **Follow a structured strength plan** organized by week and workout day.
5. **Log training in real time** with sets, reps, weight, RPE, cues, and rest.
6. **See progress over time** through workout history, PRs, body weight, and streaks.
7. **Stay motivated** by growing a melon garden and earning XP.

---

## 5. Complete feature inventory

### 5.1 Language and localization

**Status: Defined contract, with implemented formatting utilities**

The language type supports two values:

- `en` — English
- `zh` — Chinese, with the UI implementation clearly oriented toward Traditional Chinese

Localized content is represented by a reusable `BiText` object containing both `en` and `zh`. This applies to:

- Food names
- Serving labels
- Recipe names
- Ingredient names and display amounts
- Exercise names and coaching cues
- Workout-day names
- Workout-plan names and notes

Implemented locale-aware output includes:

- Short weekday labels: `Mon` through `Sun`, or `週一` through `週日`
- Short dates such as `Aug 7` or `8月7日`
- Long dates such as an English weekday/month/day string or `8月7日 週五`
- Durations in minutes or hours/minutes in both languages

Not defined:

- Where language preference is stored
- How language is selected or changed
- Fallback behavior when one translation is blank
- Number, currency, plural, and decimal localization
- Whether Chinese should be explicitly identified as `zh-TW`

### 5.2 Profiles and personal targets

**Status: Defined contract**

A profile contains:

- Stable ID
- Display name
- Emoji avatar
- Daily nutrition goals
- Selected workout-plan ID
- Preferred weight unit (`lb` or `kg`)

Daily targets include:

- Calories in cal
- Protein in grams
- Carbohydrates in grams
- Fat in grams

The model can support more than one profile because profiles have IDs, but the repository does not establish whether the product is single-profile or offers household/profile switching.

Not defined:

- Onboarding
- Goal recommendations based on age, height, sex, activity, or desired rate of change
- Profile editing UI
- Unit conversion when the preferred unit changes
- Authentication or ownership
- Cloud backup or cross-device sync

### 5.3 Food catalog

**Status: Defined contract**

Each food can contain:

- Stable ID
- English and Chinese name
- Emoji
- Nutrition per 100 g, or per 100 ml for liquids
- Optional common serving label and serving weight
- Optional estimated price per 100 g in NT dollars
- Category
- Optional barcode
- Flag indicating a user-created custom food

Supported food categories are:

- Protein
- Carbohydrate
- Vegetable
- Fruit
- Dairy
- Fat
- Drink
- Snack
- Sauce
- Other

The intended serving calculation is strongly implied:

```text
logged nutrient = food nutrient per 100 × consumed grams / 100
estimated cost  = price per 100 × consumed grams / 100
```

That formula is not currently implemented, and rounding behavior is unspecified.

Not present:

- Actual bundled foods
- Food search
- Recent or favorite foods
- Brand, package size, fiber, sodium, sugar, or micronutrients
- Food-photo recognition
- A remote nutrition database

### 5.4 Daily food and macro logging

**Status: Defined contract**

Food log entries are associated with a local calendar date and one of four meal slots:

- Breakfast
- Lunch
- Dinner
- Snack

Each entry captures:

- ID
- Date in local `YYYY-MM-DD` format
- Meal slot
- Bilingual display name
- Optional emoji
- Optional consumed grams
- Final calorie, protein, carbohydrate, and fat values
- Optional cost
- Optional source
- Optional reference ID back to a food or recipe
- Creation timestamp

Supported source values reveal five intended entry paths:

- Food catalog
- Recipe
- Manual entry
- Voice entry
- Barcode entry

Because final macros live directly on each log entry, historical nutrition remains stable even if the underlying food or recipe is edited later. That is a useful snapshot pattern, although the repository does not explicitly document it as a product decision.

A daily dashboard can derive:

- Calories and each macro consumed
- Amount remaining against the profile goal
- Percentage of each target reached
- Meal-by-meal totals
- Estimated daily food spend

No aggregation or goal-completion algorithm is implemented. The app also does not define whether exceeding a target counts as success, whether protein is a minimum while calories are a range, or how incomplete data is handled.

### 5.5 Manual food entry

**Status: Strongly implied by the log source contract**

The `manual` source allows logging an item without a catalog entity. The log model already supports a manual name, optional grams, macros, cost, and meal assignment.

Unspecified:

- Whether all four macro fields are required
- Whether calories can be derived from macros
- Input validation and decimal precision
- Whether a manual entry can be saved as a reusable custom food

### 5.6 Voice food entry

**Status: Strongly implied, not implemented**

Two independent signals indicate a planned voice workflow:

- Food logs support `voice` as a source.
- The design system includes a pulsing recording animation.

No microphone component, browser speech API, transcription service, parser, permission flow, or confirmation workflow exists. It is therefore unknown whether the intended interaction is free-form dictation, command-based logging, or audio sent to an AI service.

A safe eventual flow would require transcription review and explicit confirmation before nutrition data is saved, because neither food identity nor portion size can be assumed reliably from speech.

### 5.7 Barcode scanning

**Status: Strongly implied, not implemented**

Barcode support has the clearest multi-layer evidence among the unimplemented features:

- Food items can store a barcode.
- Logs can identify `barcode` as their source.
- ZXing browser and core packages are installed.
- CSS defines a camera scan box, full-cover video, animated scan line, and scanner-specific visual treatment.

The likely workflow is:

1. Open a scanner from the primary add action.
2. Request camera access.
3. Decode a package barcode with ZXing.
4. Match the code to a local or remote food record.
5. Select portion/grams and meal slot.
6. Review calculated macros and save a snapshot log entry.

Steps 1–6 are not implemented. Critically, no barcode lookup provider or product database exists, so decoding a number alone cannot produce nutrition facts.

Required edge cases that are currently unspecified include denied camera access, unsupported cameras, unknown barcodes, duplicate scan events, international barcode formats, offline behavior, and manual fallback.

### 5.8 Recipes

**Status: Defined contract**

Recipes support:

- Stable ID
- English and Chinese name
- Emoji
- Category
- Preparation time in minutes
- Difficulty from 1 to 3
- Number of servings
- Calories and macros per serving
- Cost per serving
- Ingredient list
- Free-form tags
- Custom/user-created flag

Recipe categories are:

- Asian
- Western
- Pasta
- Breakfast
- Vegetarian/vegetable-oriented
- Custom

Each ingredient contains a bilingual name, bilingual display amount, estimated cost for the amount used, and optional food category. Ingredients are display-oriented rather than linked to `FoodItem` IDs, so the current model cannot automatically recalculate a recipe when a catalog food changes.

The model supports recipe discovery and filtering by category, time, difficulty, tags, cost, and macros. None of those screens or filters exists.

Not defined:

- Cooking instructions or steps
- Images
- Ingredient-level quantities in machine-readable units
- Automatic macro calculation from ingredients
- Scaling ingredients when servings change
- Recipe editing, duplication, favorites, ratings, or sharing

### 5.9 Meal planning

**Status: Defined contract**

A day plan can hold zero or more planned recipes for each of the four meal slots. Each planned item identifies:

- Recipe ID
- Number of servings

Multiple recipes can be planned in the same meal slot. Because `DayPlan` itself has no date, an external date-to-plan mapping is required but not defined.

Expected derived values include daily planned calories/macros, total planned cost, and ingredient demand. No logic currently connects a planned meal to food logs or groceries.

Unspecified behaviors:

- Whether logging a planned meal checks it off or creates a separate log
- Copying days or weeks
- Dragging meals between dates/slots
- Handling deleted recipes
- Planning leftovers
- Comparing planned versus consumed values

### 5.10 Grocery list and budget tracking

**Status: Defined contract**

A grocery item contains:

- ID
- English and Chinese name
- Display quantity string
- Estimated cost
- Optional actual cost
- Checked/purchased state
- Food category or `other`

This enables:

- A categorized shopping checklist
- Estimated total versus actual total
- Individual item completion
- Bilingual item labels
- Budget-aware meal preparation

The repository does not define how the list is populated. It could be manual, generated from the meal plan, or both. Ingredient consolidation, unit conversion, pantry subtraction, quantity editing, and list sharing are not modeled.

### 5.11 Workout plans

**Status: Defined contract**

Workout programming is hierarchical:

```text
Workout plan
  -> one or more weeks
      -> one or more workout days
          -> one or more exercise prescriptions
```

A workout plan contains:

- ID
- Bilingual name
- Optional bilingual note
- Ordered weeks

Each workout day contains an ID, bilingual name, and ordered exercises.

Each exercise prescription contains:

- ID
- Bilingual name
- Target number of sets
- Flexible rep target string, such as `6`, `20 sec`, or `10/leg`
- Optional target RPE
- Optional rest time in minutes
- Optional bilingual coaching cue
- Optional seed/working weight

The `seedWeight` comment says the value comes from an imported sheet. This is evidence of an intended or previously external spreadsheet-import workflow, but no importer, supported file format, or mapping rules exist in the repository.

The flexible rep string accommodates strength sets, timed work, unilateral work, and other prescriptions, but it also means target completion cannot be validated numerically without additional parsing rules.

### 5.12 Live workout session

**Status: Defined contract with strongly implied UI behavior**

Starting a workout creates a session tied to:

- Date
- Plan ID
- Week index
- Day index
- Snapshot of the bilingual day name
- Start timestamp

Each exercise in the session snapshots:

- A normalized exercise-history key
- Bilingual name
- Target sets and reps
- Optional target RPE, rest time, and cue
- Actual set logs

Each set log records:

- Weight in the profile's selected unit
- Completed reps
- Optional actual RPE
- Done/not-done state

Completing a session can add:

- End timestamp
- Count of personal records achieved

The design system includes a fixed rest-timer bar positioned above the floating tab bar. This strongly indicates automatic or user-triggered rest timing during a session. Timer logic, background behavior, sound/vibration, skip/add-time controls, and notification permissions do not exist.

Likely session actions supported by the model are checking off sets, changing weight/reps/RPE, reviewing exercise cues, moving between exercises, and ending a workout. Adding/removing/reordering exercises and sets is not explicitly modeled but could be handled in client state.

### 5.13 Workout history and personal records

**Status: Defined contract, algorithm unspecified**

Completed session records can power:

- Workout history by date
- Duration from `endedAt - startedAt`
- Exercise history using the normalized exercise key
- Previous working weight and reps
- Session PR count
- Training consistency

The model deliberately separates an exercise-history key from the localized display name. That should allow English and Chinese names to share one history stream if key normalization is consistent.

No PR definition is present. It might mean highest weight, highest reps at a weight, estimated one-rep max, total volume, or any combination. No volume, estimated 1RM, progression, or chart calculation exists.

The session points to its original plan and week/day indexes while also snapshotting exercise targets and names. The snapshot protects part of history from plan edits, but the behavior when a plan is deleted is unspecified.

### 5.14 Body-weight tracking

**Status: Defined contract**

A weight entry is a date plus a value in the profile's chosen unit. This supports a basic chronological weight log and trend chart.

Not defined:

- Multiple entries on one day
- Unit conversion
- Goal weight
- Moving averages or trend calculations
- Editing and deletion
- Body-fat percentage, measurements, progress photos, or notes
- Smart-scale, Apple Health, or Google Health Connect integration

### 5.15 Gamification: melon garden, streaks, and XP

**Status: Defined contract with strongly implied celebration UI**

The game state contains:

- Current streak
- Best streak
- Number of grown melons
- Number of golden melons
- XP
- Last date evaluated
- Per-date history of whether the goal was hit

Code comments explain the reward meanings:

- A normal melon represents a goal day.
- A golden melon represents a personal record.

The visual system adds:

- A seven-column melon garden, naturally matching a week
- Square garden cells with emoji-sized content
- Pop and floating animations
- Full-screen confetti animation primitives

The intended motivational loop is likely:

1. Complete a daily nutrition/fitness goal.
2. Mark that local date as successful.
3. Increase the streak and grow a melon.
4. Set a new workout PR and earn a golden melon.
5. Gain XP for continued activity.

The exact loop is not implemented. The following rules remain unknown:

- What qualifies as a goal day
- Whether nutrition, workout, or both are required
- When the day is evaluated
- Whether past days can be recalculated after editing a log
- Streak handling across time zones or missed days
- XP amounts, levels, rewards, or maximums
- Whether multiple PRs create multiple golden melons

`lastEval` suggests daily evaluation should be idempotent so reopening the app cannot award the same date twice.

### 5.16 Date and week behavior

**Status: Implemented foundation**

The date utilities establish important product rules:

- User-facing dates use local time, not UTC.
- Persisted day keys use `YYYY-MM-DD`.
- Calendar weeks start on Monday.
- Week helpers always return seven consecutive dates.
- Dates can be shifted by a number of calendar days.
- Short and long labels are language-aware.
- Session durations round to the nearest minute.

Potential edge cases:

- `parseDate` accepts invalid or partial values without validation.
- `diffDays` divides milliseconds by a fixed 24-hour day and rounds; daylight-saving transitions deserve tests.
- English long-date formatting uses the runtime locale/time-zone environment.
- Durations under 30 seconds display as zero minutes.

### 5.17 Mobile navigation and primary add action

**Status: Strongly implied, not implemented**

The visual system defines a floating pill-shaped tab bar with:

- Compact tab items
- Active/inactive states
- A raised, oversized center plus button
- iOS safe-area spacing

The most likely purpose of the center button is a quick-add hub for food, barcode, voice, weight, or other records. Actual tab names, tab count, routing, and plus-menu actions are unknown and should not be inferred as current features.

### 5.18 Bottom sheets and selection controls

**Status: Implemented style foundation**

The app has detailed styles for mobile bottom sheets:

- Dimmed and blurred backdrop
- Slide-up animation
- Grab handle
- Maximum height of 88% of the dynamic viewport
- Internal scrolling
- Safe-area padding

Segmented controls, chips, category filters, list rows, buttons, icon buttons, and touch feedback are also defined. These primitives fit food filters, meal-slot selection, recipe filters, workout selection, and profile settings, but no components currently bind them to data.

### 5.19 Loading, feedback, and celebration

**Status: Implemented style foundation**

Available UI feedback patterns include:

- Skeleton shimmer for loading
- Button press scaling and opacity feedback
- Staggered content entrance
- Pop animation
- Floating animation
- Recording pulse
- Scanner sweep line
- Sheet and backdrop entrance
- Confetti fall

There are no error, toast, validation, offline, or empty-state components in the app code.

### 5.20 Appearance and responsive behavior

**Status: Implemented style foundation**

The design language is called **“honeydew liquid glass.”** It uses melon green, cantaloupe orange, and watermelon coral accents over translucent blurred surfaces.

Confirmed behavior:

- Mobile-first content column capped at 560 px
- Dynamic viewport and iOS safe-area support
- Automatic dark theme through `prefers-color-scheme`
- System-native font stack with Traditional Chinese coverage
- Consistent rounded cards, controls, sheets, and navigation
- Dedicated colors for calories, protein, carbohydrates, fat, and danger states
- Ambient background gradients and blurred fruit-colored shapes
- Hidden scrollbars for intentionally scrollable regions
- Text selection disabled globally except in inputs and textareas

Not present:

- Manual theme selector
- Desktop/tablet-specific layout beyond the centered narrow column
- Reduced-motion media query
- High-contrast mode
- Verified WCAG contrast or keyboard behavior

---

## 6. End-to-end workflows the models are designed to support

These are reconstructions from the contracts, not currently runnable journeys.

### Flow A: Log a catalog food

1. Choose a date and meal slot.
2. Search or browse food categories.
3. Select a food and enter grams or choose its common serving.
4. Calculate calories, macros, and optional estimated cost from per-100 values.
5. Save a log snapshot with `src: "food"` and the food ID in `refId`.
6. Recalculate the day's progress toward profile goals.

### Flow B: Scan packaged food

1. Open the barcode camera.
2. Decode a barcode with ZXing.
3. Resolve the barcode to a food record.
4. Choose portion and meal slot.
5. Review and save a log with `src: "barcode"`.
6. If the barcode is unknown, fall back to a custom/manual-food workflow.

### Flow C: Plan meals and shop

1. Browse recipes by category, tags, time, difficulty, price, or macros.
2. Add a recipe and serving count to a date and meal slot.
3. Review planned daily nutrition and cost.
4. Convert ingredients into grocery items.
5. Shop from a categorized checklist.
6. Record actual prices and compare them with estimates.
7. Log the cooked recipe by servings consumed.

Automatic ingredient consolidation and grocery generation are product expectations, not supported by the current ingredient schema without further work.

### Flow D: Complete a planned workout

1. Select the current week and workout day from the profile's plan.
2. Create a session with copied exercise targets and start time.
3. For each set, record weight, reps, and optional RPE, then mark it done.
4. Run the prescribed rest timer between sets.
5. Compare performance with history and detect PRs.
6. End the session, record end time and PR count, and persist it.
7. Celebrate PRs and update game rewards.

### Flow E: Review progress

1. Open a local calendar day or Monday-start week.
2. Review nutrition goal completion, meal logs, and spend.
3. Review completed sessions, durations, and PRs.
4. Review weight entries over time.
5. See the goal-day streak, best streak, XP, and melon garden.

---

## 7. Data model reference

| Entity | Primary purpose | Key relationships |
|---|---|---|
| `BiText` | English/Chinese content | Embedded in most named records |
| `Macros` | Calories, protein, carbs, and fat | Embedded in foods, logs, recipes, and goals |
| `FoodItem` | Reusable nutrition catalog record | Referenced by a food log's optional `refId` |
| `LogEntry` | Immutable-style consumed-food snapshot | Belongs to date and meal slot; may reference food/recipe |
| `Ingredient` | Display and cost line in a recipe | Embedded in `Recipe`; not linked to `FoodItem` |
| `Recipe` | Multi-serving prepared meal | Referenced by `PlannedMeal` and potentially a log |
| `PlannedMeal` | Recipe plus serving count | Embedded in a meal slot within `DayPlan` |
| `DayPlan` | Planned meals by meal slot | Requires an external date mapping |
| `GroceryItem` | Shopping checklist and cost record | No explicit link to recipe/ingredient |
| `ExerciseSpec` | Exercise prescription | Embedded in a workout day |
| `WorkoutDay` | Ordered exercise day | Embedded in a workout week |
| `WorkoutWeek` | Ordered training days | Embedded in a workout plan |
| `WorkoutPlan` | Complete multi-week program | Selected by `Profile`; referenced by sessions |
| `SetLog` | Actual performance for one set | Embedded in a session exercise |
| `SessionExercise` | Snapshot of exercise target plus actual sets | Embedded in a workout session |
| `WorkoutSession` | One performed workout | References plan/week/day and records PR count |
| `WeightEntry` | Daily body-weight value | Uses profile unit |
| `Goals` | Daily nutrition targets | Embedded in profile |
| `Profile` | User preferences and selected plan | Connects goals, units, and workout plan |
| `GameState` | Streak, rewards, XP, and daily success | History keyed by local date |

### Important modeling observations

- Nutrition log entries store calculated macro snapshots, which is appropriate for historical integrity.
- Session exercises also snapshot targets and display names, partially protecting history from plan edits.
- Ingredients and groceries use display quantities instead of structured units, limiting reliable automation.
- `DayPlan` lacks a date, so its owner must be a date-keyed collection.
- Weight entries lack IDs and timestamps, which implies one value per date unless the model changes.
- Game history stores only a Boolean per date, not why the day succeeded or failed.
- Monetary values do not define currency in the type system; comments establish NT dollars only for food pricing.
- Numeric fields do not define precision, allowed ranges, or validation behavior.

---

## 8. What is not in the existing product contract

No evidence was found for the following features:

- Accounts, sign-in, password recovery, or social login
- Cloud database, sync, backups, conflict resolution, or multi-device use
- Notifications, workout reminders, meal reminders, or rest-timer background alerts
- Apple Health, Google Health Connect, Garmin, Fitbit, Strava, or smart-scale integrations
- Step counting, sleep, water, heart rate, or cardio/GPS activity tracking
- Body measurements, body-fat percentage, progress photos, or measurements beyond weight
- Social feed, friends, leaderboards, challenges, trainer messaging, or sharing
- AI coaching, training-plan generation, nutrition recommendations, or image recognition
- Exercise videos, images, muscle groups, equipment metadata, or substitutions
- Injury, pain, readiness, recovery, or mobility tracking
- Pantry inventory, expiration dates, or household grocery collaboration
- Data export/import, privacy controls, consent, deletion, or retention settings
- Subscriptions, payments, advertisements, or premium tiers
- Accessibility settings
- PWA manifest, offline service worker, install prompt, or push notifications
- Analytics, crash reporting, feature flags, or observability

These should not be advertised as existing features.

---

## 9. Gaps that block a usable MVP

### Product/runtime gaps

1. No route or root layout; users see no product page.
2. No state store or persistence; no record can be created or retained.
3. No initial food, recipe, or workout-plan dataset.
4. No dashboard or navigation implementation.
5. No nutrition calculations or goal evaluation.
6. No workout-session engine, rest timer, PR algorithm, or history views.
7. No camera permission, decoder integration, or barcode data provider.
8. No voice capture/transcription path.
9. No recipe-to-grocery derivation logic.
10. No error handling, validation, migration, or recovery strategy.

### Engineering gaps

- App Router structure and client/server boundaries
- Zustand store design and persistence middleware
- Schema versioning and migrations
- Runtime validation for stored/imported data
- Tests for nutrition math, dates, streaks, PRs, and unit conversion
- Lint configuration compatible with the chosen Next.js version
- Accessibility and reduced-motion support
- Camera and microphone browser compatibility handling
- Privacy posture for health-adjacent personal data

---

## 10. Recommended implementation sequence

This sequence follows the contracts already present and avoids inventing a different product.

### Phase 1: Make the foundation runnable

- Add the root layout, page, metadata, and mobile shell.
- Convert the CSS patterns into reusable React components.
- Define a versioned Zustand store and local persistence.
- Add runtime validation and safe defaults.
- Create sample profile, foods, recipes, and workout plans in both languages.
- Add route-level empty, loading, and error states.

### Phase 2: Nutrition MVP

- Daily dashboard with calorie/macro progress.
- Food search/category browsing and serving calculation.
- Manual food logging and edit/delete.
- Recipe browse/detail and add-by-serving.
- Date navigation and meal grouping.
- Deterministic daily goal evaluation.

### Phase 3: Strength-training MVP

- Plan/week/day browser.
- Workout-session creation from a plan snapshot.
- Set logging for weight, reps, done state, and RPE.
- Rest timer.
- Session completion, duration, history, and previous-set recall.
- Explicit, tested PR rules.

### Phase 4: Planning and progress

- Date-keyed meal planner.
- Grocery checklist with estimated/actual totals.
- Weight logging and trend view.
- Melon garden, streaks, golden PR melons, XP, and celebrations.
- Language and unit settings.

### Phase 5: Fast-input integrations

- ZXing camera scanner with permissions and manual fallback.
- Barcode nutrition provider plus custom-product creation.
- Voice transcription and structured review flow.
- Offline, error, duplicate, and privacy handling for both inputs.

### Phase 6: Reliability

- Unit, component, and end-to-end coverage.
- Data migrations and export/restore.
- Accessibility, keyboard, contrast, and reduced-motion audit.
- Performance and low-end mobile-browser testing.
- Decide whether local-only data is sufficient or whether accounts and sync are needed.

---

## 11. Decisions that must be made before implementation is complete

1. What exactly makes a day a successful “goal day”?
2. Are calories/macros hard limits, ranges, or minimum targets?
3. What actions grant XP, and is there a level/reward system?
4. What exactly qualifies as a workout PR?
5. Is the product local-only, or will it support accounts and cloud sync?
6. Is there one profile per installation or profile switching?
7. What barcode/product database will provide nutrition facts?
8. What service or on-device capability will process voice entries?
9. Should recipes calculate nutrition from structured ingredients or store manual per-serving values?
10. How should groceries consolidate ingredient amounts and units?
11. How should weights and workout loads behave when the user changes between lb and kg?
12. Can users edit past days, and should that recalculate streaks and rewards?
13. Which actions work offline, and how are failed integrations recovered?
14. What privacy, export, and deletion guarantees apply to personal health data?

---

## 12. Acceptance checklist for parity with the current contract

The app can be considered a functional implementation of the existing design only when a user can:

- Switch between English and Traditional Chinese throughout the app.
- Configure calorie and macro goals, workout plan, and lb/kg unit.
- Log breakfast, lunch, dinner, and snacks from catalog, recipe, or manual input.
- Review daily calorie, protein, carbohydrate, fat, and cost totals.
- Create and use custom foods and recipes.
- Plan recipe servings into dated meal slots.
- Build/use a grocery checklist with estimated and actual spending.
- Browse a multi-week workout plan.
- Record every workout set's weight, reps, optional RPE, and completion.
- Use rest timing and finish a session with duration and PR results.
- Review workout and exercise history.
- Record and review body weight.
- Earn deterministic streak, melon, golden-melon, and XP rewards without duplicate awards.
- Scan a barcode with a robust unknown-code fallback.
- Review and confirm a voice-created food entry before saving.
- Retain records safely across reloads and application upgrades.
- Understand loading, empty, error, denied-permission, and offline states.

At the time of this audit, none of these end-to-end acceptance items is runnable; only their data and visual foundations exist.

---

## 13. Bottom line

MelonMate already has a consistent product concept and unusually comprehensive domain scaffolding for an early-stage codebase. The intended feature set is a bilingual, Taiwan-aware nutrition, food-budget, meal-planning, strength-training, progress, and gamification app with barcode and voice-assisted input. The visual foundation is purpose-built for a polished mobile experience.

The next development task is not feature discovery; it is turning these contracts into a working, persisted application while defining the few critical algorithms the models leave open: daily goal success, PR detection, XP rewards, serving math/rounding, unit conversion, and data synchronization.
