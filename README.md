# MelonMate 🍈 瓜瓜日誌

A personal food & fitness companion — eat well, lift heavy, grow melons, and cheer on friends.

Built for one person per phone: U.S. barcode, AI food-photo, voice, and search logging with macro rings that reset daily, weekly meal planning, grocery lists with real cost tracking, full workout logging with progressive-overload charts, and a melon-garden streak system. Honey, the in-app honeydew assistant, can chat or listen, draft recipes, preview food logs, update targets, and edit workout plans with confirmation. Add friends by invite code to see each other's progress without exposing private logs.

**English + 繁體中文** (toggle in Me → Language, defaults to English) · iPhone-first liquid-glass design · light & dark mode · installable PWA and native Capacitor iOS app.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

## Deploy to Vercel

Option A — CLI (fastest):

```bash
npx vercel          # first time: log in, accept defaults
npx vercel --prod
```

Option B — GitHub:

1. Push this folder to a GitHub repo (`git init && git add -A && git commit -m "MelonMate v1"`, then push).
2. In [vercel.com/new](https://vercel.com/new), import the repo. Framework auto-detects as Next.js. Add `OPENAI_API_KEY` to enable AI food-photo estimates and Honey. `OPENAI_VISION_MODEL`, `OPENAI_FOOD_MODEL`, and `OPENAI_AGENT_MODEL` are optional; all three default to `gpt-5.6-sol`.
3. Every push to `main` auto-deploys.

**After deploying, on each iPhone:** open the URL in Safari → Share → **Add to Home Screen**. It launches full-screen like a native app.

> Camera (barcode) and microphone (voice) require HTTPS — they work on the Vercel URL and on `localhost`, but not on plain `http://` LAN IPs.

## Native iPhone app (Capacitor)

The native app bundles the same interface and on-device Zustand data as the web app. AI food estimates, Honey, friend sync, and push-token registration still use the hosted Next.js API, so deploy that API first and give the native build its HTTPS origin.

```bash
cp .env.example .env.local
# Set CAPACITOR_API_ORIGIN to the deployed HTTPS origin, then:
npm run cap:sync
npm run cap:open
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities**, choose the Apple Developer team, and keep bundle ID `com.melonmate.app` (or change it consistently in Capacitor, Xcode, and APNs).
2. Confirm **HealthKit** and **Push Notifications** capabilities are present. The checked-in entitlements are development defaults; Xcode/provisioning supplies the distribution values for an App Store archive.
3. Run on a physical iPhone. The Simulator can verify the interface, but not real HealthKit samples or a production APNs device token.
4. In **Me**, tap **Apple Health** to authorize and sync daily steps/Apple stand time. Enable **Push notifications** and the optional local 7:00 PM food-log reminder separately.
5. Open the app once, then long-press the Lock Screen → **Customize** → tap the widget area → **MelonMate** → **Quick Food Log**. The circular, rectangular, and inline widgets all open food logging directly.

`npm run cap:build` creates the static native web bundle in `mobile-dist/`. `npm run cap:sync` also copies it and all native plugins into the Xcode project. Re-run it after web or plugin changes.

### Push server setup

Set these on the hosted Next.js API:

```dotenv
UPSTASH_REDIS_REST_URL=   # legacy alias: KV_REST_API_URL
UPSTASH_REDIS_REST_TOKEN= # legacy alias: KV_REST_API_TOKEN
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_PRIVATE_KEY=         # .p8 contents; literal \n escapes are accepted
APNS_BUNDLE_ID=com.melonmate.app
APNS_PRODUCTION=true      # false for Xcode development builds
PUSH_ADMIN_SECRET=
```

After a device registers, send a protected test notification through `POST /api/push/test`:

```json
{
  "deviceId": "the-profile-device-id",
  "title": "Your melon is ready",
  "body": "Harvest it before planting the next crop.",
  "path": "/me"
}
```

Use `Authorization: Bearer <PUSH_ADMIN_SECRET>`. This test endpoint sends only to the requested registered device; scheduled or campaign notifications can build on the same APNs sender and token store.

### App Store release checklist

- Archive a **Release** build on a real Apple Developer team and upload it through Xcode Organizer.
- Create the App Store Connect privacy disclosure, including Health data, identifiers/device token usage, and any data sent to the hosted API.
- Supply review notes explaining that Health access is optional and used only for steps/standing XP; provide a working review account or demo path if later features require sign-in.
- Test camera, photo picker, voice logging, backup/import, Health sync, local notifications, APNs, deep links, AI/Honey, and friend sync on a physical release build before TestFlight submission.

## How data works

- Private logs and settings live **on the device** (localStorage). Each phone has one profile for its owner.
- Friend sync publishes a small progress snapshot (streak, level, garden, daily calorie/protein progress, and latest workout summary). It never syncs private logs, recipes, groceries, plans, goals, or settings.
- **Backup / move data:** Me → Export backup (JSON file) → Import on the other device. Do this weekly.
- Nutrition per 100 g and U.S.-dollar prices in the built-in library are practical estimates. Barcode scans pull label data from Open Food Facts; AI photo results always require portion confirmation before logging.

## What's inside

| Area | Details |
| --- | --- |
| **Today** | Calorie ring (resets each day), protein/carb/fat bars, meal timeline, quick barcode/photo/voice/search actions, body-weight log, today's workout shortcut |
| **Honey** | Text or voice conversation, spoken replies, contextual food logging, recipe drafting by time/budget/diet, target changes, and workout-plan edits; every write is previewed for approval |
| **Kitchen** | 26 seeded recipes from the 瓜飼料 list with macros/cost/time, weekly planner grid, one-tap grocery list generation, est. vs actual spend |
| **Gym** | Two starter hypertrophy plans (targets, RPE, rest, form cues, last weights), set-by-set logging with rest timer, PR confetti, est-1RM & weekly volume charts, full plan editor |
| **Me** | Melon garden, add-friend invites and friend progress, goals, themes, language/units, weight trend, 7-day food spend, backup/restore |

## Voice logging examples

- "兩顆蛋 一碗飯" → 2 eggs + 1 bowl of rice
- "chicken breast 200 grams"
- "早餐 酪梨吐司" → logs avocado toast to breakfast
- Works in 中文 or English — pick the mic language on the voice screen.

## Tech

Next.js 16 · React 19 · Capacitor 8 · Swift/HealthKit · APNs · Tailwind CSS v4 · zustand (persisted) · @zxing/browser (barcode) · Web Speech API (voice) · Open Food Facts (barcode nutrition) · OpenAI Responses API (food-photo estimates) · optional Redis-compatible friend sync.

## iPhone Lock Screen quick log

The native iOS app includes a WidgetKit extension. After opening MelonMate once, long-press the Lock Screen → **Customize** → choose the Lock Screen → tap the widget area → select **MelonMate · Quick Food Log**. Tapping the widget opens `/add` through the `melonmate://` deep link, where search, voice, manual entry, barcode, and photo logging are available.

The PWA keeps the previous Apple Shortcuts fallback: open **Me → iPhone Lock Screen**, copy a quick-log URL, and assign it to a Shortcuts Lock Screen widget.
