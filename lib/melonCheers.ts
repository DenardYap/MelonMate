import type { Lang } from "./types";

export const MELON_CHEERS = [
  "Melon accomplished!", "That log was one in a melon.", "Ripe on track!", "You crushed it—seed and done.",
  "A juicy little win.", "Freshly logged and feeling vine.", "You’re growing on yourself.", "Nice slice of progress.",
  "Rind over matter.", "Seed the day!", "Your goals are looking ripe.", "Another bite, neatly counted.",
  "That’s some fine fruit work.", "Melon mode: thriving.", "Small log, big grow.", "You’ve got the juice.",
  "A perfectly ripe check-in.", "Calorie bank updated—smoothly seeded.", "Good things grow one log at a time.", "That entry was vine and dandy.",
  "Keep calm and melon on.", "A fresh win for the patch.", "Nicely peeled and revealed.", "You made that look seedless.",
  "Progress is officially in season.", "Logged with zest.", "The patch approves.", "You’re on a roll—cantaloupe behind.",
  "Water-me-lon proud of that.", "Another goal getting ripe.", "Sweet move, no pits about it.", "The rind stuff is working.",
  "That log hit the sweet spot.", "Your streak just got juicier.", "Sowing good habits.", "Fresh data, fresh momentum.",
  "A little slice for future you.", "That’s how the garden grows.", "You’re cultivating consistency.", "A clean log with melon energy.",
  "Ripe, recorded, ready.", "The calorie patch is up to date.", "Well seeded!", "Your goals say thanks a melon.",
  "That was smooth as honeydew.", "A crisp little checkmark.", "One more log in the fruit basket.", "Consider that meal melon-managed.",
  "Your progress is sprouting.", "A tasty bit of accountability.", "You’re making room to bloom.", "Another habit planted.",
  "Nothing seedy about that win.", "The numbers are looking fresh.", "You picked a good moment to log.", "That’s peak produce behavior.",
  "A bite-sized win.", "You’re keeping it fresh.", "The vine is vibing.", "That log deserves a tiny melon bow.",
  "Fruitful work!", "You’re building a bumper crop of good habits.", "Patch notes: doing great.", "Ripe and right on time.",
  "That meal is officially accounted for.", "A smart slice of self-care.", "Seed by seed, you’re getting there.", "Melon momentum unlocked.",
  "A fresh entry for a fresh you.", "Counted, confirmed, cultivated.", "The garden ledger is glowing.", "No drama, just good data.",
  "Your calorie bank is balanced and breezy.", "That was un-be-rind-ably smooth.", "A melon-sized high five.", "Logged before it could roll away.",
  "You’re making consistency look delicious.", "The patch just got smarter.", "A nourishing little win.", "That’s the spirit of the rind.",
  "Another seed of progress planted.", "This habit is ripening nicely.", "Your future melon self approves.", "Neat, sweet, complete.",
  "A good log is always in season.", "You served that entry perfectly.", "The numbers are ripe for success.", "That was a fruitful tap.",
  "Your goals just got a little closer.", "A small slice, a solid stride.", "Logged with zero melon-choly.", "Now that’s a well-rounded rind.",
  "The fruit of consistency tastes good.", "One entry closer to full bloom.", "A juicy win for the day.", "You’re tending this goal beautifully.",
  "That log landed right in the sweet spot.", "Rind and shine!", "Freshly counted, confidently carried on.", "The patch says: nice one.",
] as const;

const ZH_CHEERS = ["瓜瓜幫你記好啦！", "又種下一顆好習慣。", "清爽記錄，繼續前進！", "今天也很有瓜勁。", "這筆記錄熟得剛剛好。"] as const;

export function melonCheer(lang: Lang, seed = Date.now()): string {
  const choices = lang === "zh" ? ZH_CHEERS : MELON_CHEERS;
  return choices[Math.abs(Math.floor(seed)) % choices.length];
}

